import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { generateRateLimitMax, generateRateLimitWindowMs } from "../config";
import { recordUsageEvent, assertGenerateQuota } from "../services/usage";
import { authRequired, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { logInfo } from "../utils/observability";
import { qualityReportFor } from "../utils/quality";
import { rateLimit } from "../utils/rate-limit";
import { generateText, isMeaningfullyDifferentRevision, reviseNaskahContent, streamGeneratedText } from "../services/openai";
import { retrieveDalilContext } from "../services/myquran";

const generateSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown())
});

const reviewSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown()),
  content: z.string().min(20)
});

const refineDraftSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown()),
  content: z.string().min(20),
  instruction: z.string().trim().min(5, "Instruksi revisi minimal 5 karakter."),
  targetSection: z.string().trim().max(120).optional()
});

export const generateRoutes = new Hono<AppEnv>();

generateRoutes.use("*", authRequired);
generateRoutes.use("*", rateLimit({ keyPrefix: "generate", windowMs: generateRateLimitWindowMs, max: generateRateLimitMax }));

generateRoutes.post("/", zValidator("json", generateSchema), async (c) => {
  const user = c.get("user");
  const { jenis, parameters } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const quota = await assertGenerateQuota(user.id);
  if (!quota.allowed) {
    await recordUsageEvent({ userId: user.id, eventType: "generate", status: "blocked", jenis, route: "/api/generate", metadata: { reason: "quota" } });
    return c.json({ message: quota.message }, 429);
  }

  const startedAt = Date.now();
  const dalilContext = await retrieveDalilContext(jenis, parameters);
  const dalilRetrievedAt = Date.now();
  const content = await generateText(jenis, parameters, dalilContext);
  const generatedAt = Date.now();
  const quality = qualityReportFor(jenis, content, parameters, dalilContext);
  logInfo("generate.request", {
    route: "/api/generate",
    jenis,
    userId: user.id,
    dalilMs: dalilRetrievedAt - startedAt,
    generateMs: generatedAt - dalilRetrievedAt,
    qualityMs: Date.now() - generatedAt,
    totalMs: Date.now() - startedAt,
    qualityScore: quality.score,
    wordCount: quality.wordCount
  });
  await recordUsageEvent({
    userId: user.id,
    eventType: "generate",
    status: "ok",
    jenis,
    route: "/api/generate",
    durationMs: Date.now() - startedAt,
    metadata: {
      qualityScore: quality.score,
      wordCount: quality.wordCount,
      quotaUsed: quota.used + 1,
      quotaLimit: quota.limit,
      dalilSource: dalilContext.source,
      quranReference: dalilContext.quran[0]?.reference,
      hadithReference: dalilContext.hadith[0]?.reference
    }
  });
  return c.json({
    title: titleFromParameters(jenis, parameters),
    content,
    quality
  });
});

generateRoutes.post("/stream", zValidator("json", generateSchema), async (c) => {
  const user = c.get("user");
  const { jenis, parameters } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const quota = await assertGenerateQuota(user.id);
  if (!quota.allowed) {
    await recordUsageEvent({ userId: user.id, eventType: "generate", status: "blocked", jenis, route: "/api/generate/stream", metadata: { reason: "quota" } });
    return c.json({ message: quota.message }, 429);
  }

  c.header("Cache-Control", "no-cache, no-transform");
  return streamText(c, async (stream) => {
    const startedAt = Date.now();
    const dalilContext = await retrieveDalilContext(jenis, parameters);
    const dalilRetrievedAt = Date.now();
    let content = "";
    for await (const chunk of streamGeneratedText(jenis, parameters, dalilContext)) {
      content += chunk;
      await stream.write(chunk);
    }
    const generatedAt = Date.now();
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    logInfo("generate.request", {
      route: "/api/generate/stream",
      jenis,
      userId: user.id,
      dalilMs: dalilRetrievedAt - startedAt,
      generateMs: generatedAt - dalilRetrievedAt,
      totalMs: Date.now() - startedAt,
      wordCount
    });
    await recordUsageEvent({
      userId: user.id,
      eventType: "generate",
      status: "ok",
      jenis,
      route: "/api/generate/stream",
      durationMs: Date.now() - startedAt,
      metadata: {
        wordCount,
        quotaUsed: quota.used + 1,
        quotaLimit: quota.limit,
        dalilSource: dalilContext.source,
        quranReference: dalilContext.quran[0]?.reference,
        hadithReference: dalilContext.hadith[0]?.reference
      }
    });
  });
});

generateRoutes.post("/review", zValidator("json", reviewSchema), async (c) => {
  const { jenis, parameters, content } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const startedAt = Date.now();
  const dalilContext = await retrieveDalilContext(jenis, parameters);
  const quality = qualityReportFor(jenis, content, parameters, dalilContext);
  logInfo("generate.review", {
    jenis,
    dalilMs: Date.now() - startedAt,
    qualityScore: quality.score,
    wordCount: quality.wordCount
  });
  return c.json({ quality });
});

generateRoutes.post("/refine", zValidator("json", refineDraftSchema), async (c) => {
  const user = c.get("user");
  const { jenis, parameters, content, instruction, targetSection } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const quota = await assertGenerateQuota(user.id);
  if (!quota.allowed) {
    await recordUsageEvent({ userId: user.id, eventType: "generate", status: "blocked", jenis, route: "/api/generate/refine", metadata: { reason: "quota" } });
    return c.json({ message: quota.message }, 429);
  }

  const startedAt = Date.now();
  const dalilContext = await retrieveDalilContext(jenis, parameters);
  const dalilRetrievedAt = Date.now();
  const revisedContent = await reviseNaskahContent({
    jenis,
    parameters,
    currentContent: content,
    instruction,
    targetSection,
    dalilContext
  });
  const revisedAt = Date.now();
  if (!isMeaningfullyDifferentRevision(content, revisedContent)) {
    await recordUsageEvent({
      userId: user.id,
      eventType: "generate",
      status: "error",
      jenis,
      route: "/api/generate/refine",
      durationMs: Date.now() - startedAt,
      metadata: {
        mode: "refine_draft",
        reason: "unchanged_output"
      }
    });
    return c.json({ message: "Revisi AI tidak menghasilkan perubahan. Coba instruksi yang lebih spesifik atau periksa konfigurasi provider AI." }, 409);
  }
  const quality = qualityReportFor(jenis, revisedContent, parameters, dalilContext);
  logInfo("generate.refine", {
    route: "/api/generate/refine",
    jenis,
    userId: user.id,
    dalilMs: dalilRetrievedAt - startedAt,
    reviseMs: revisedAt - dalilRetrievedAt,
    qualityMs: Date.now() - revisedAt,
    totalMs: Date.now() - startedAt,
    qualityScore: quality.score,
    wordCount: quality.wordCount
  });

  await recordUsageEvent({
    userId: user.id,
    eventType: "generate",
    status: "ok",
    jenis,
    route: "/api/generate/refine",
    durationMs: Date.now() - startedAt,
    metadata: {
      mode: "refine_draft",
      qualityScore: quality.score,
      wordCount: quality.wordCount,
      quotaUsed: quota.used + 1,
      quotaLimit: quota.limit
    }
  });

  return c.json({ content: revisedContent, quality });
});
