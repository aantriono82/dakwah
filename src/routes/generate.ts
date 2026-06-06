import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { generateRateLimitMax, generateRateLimitWindowMs } from "../config";
import { recordUsageEvent, assertGenerateQuota } from "../services/usage";
import { authRequired, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { qualityReportFor } from "../utils/quality";
import { rateLimit } from "../utils/rate-limit";
import { generateText, streamGeneratedText } from "../services/openai";
import { retrieveDalilContext } from "../services/myquran";

const generateSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown())
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
  const content = await generateText(jenis, parameters, dalilContext);
  const quality = qualityReportFor(jenis, content, parameters, dalilContext);
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
    let content = "";
    for await (const chunk of streamGeneratedText(jenis, parameters, dalilContext)) {
      content += chunk;
      await stream.write(chunk);
    }
    const quality = qualityReportFor(jenis, content, parameters, dalilContext);
    await recordUsageEvent({
      userId: user.id,
      eventType: "generate",
      status: "ok",
      jenis,
      route: "/api/generate/stream",
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
  });
});
