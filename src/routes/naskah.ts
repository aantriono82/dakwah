import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { naskah, naskahVersions, type Naskah, type QualityReport, type User } from "../db/schema";
import { reviseNaskahContent } from "../services/openai";
import { assertGenerateQuota, recordUsageEvent } from "../services/usage";
import { authRequired, canAccessOwner, publicUser, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { qualityReportFor } from "../utils/quality";

const saveSchema = z.object({
  title: z.string().min(3).optional(),
  jenis: z.enum(CONTENT_TYPES),
  bahasa: z.string().default("Indonesia"),
  duration: z.string().optional(),
  parameters: z.record(z.unknown()),
  content: z.string().min(20),
  status: z.enum(["draft", "final"]).optional(),
  autosave: z.boolean().optional(),
  changeSummary: z.string().trim().min(3).max(160).optional()
});

const refineSchema = z.object({
  instruction: z.string().trim().min(5, "Instruksi revisi minimal 5 karakter."),
  targetSection: z.string().trim().max(120).optional()
});

export const naskahRoutes = new Hono<AppEnv>();
naskahRoutes.use("*", authRequired);

type NaskahRow = Naskah & { user?: User | null };

function publicNaskah(row: NaskahRow) {
  return {
    ...row,
    user: row.user ? publicUser(row.user) : row.user
  };
}

async function createVersionSnapshot(input: {
  row: Naskah;
  versionNumber: number;
  qualityReport?: QualityReport | null;
  changeSummary?: string;
}) {
  await db.insert(naskahVersions).values({
    id: nanoid(),
    naskahId: input.row.id,
    userId: input.row.userId,
    versionNumber: input.versionNumber,
    title: input.row.title,
    content: input.row.content,
    parameters: input.row.parameters,
    qualityScore: input.qualityReport?.score ?? input.row.qualityScore,
    qualityReport: input.qualityReport ?? input.row.qualityReport,
    changeSummary: input.changeSummary || "Simpan naskah"
  });
}

naskahRoutes.get("/", async (c) => {
  const user = c.get("user");
  const rows =
    user.role === "admin"
      ? await db.query.naskah.findMany({ orderBy: desc(naskah.createdAt), with: { user: true } })
      : await db.query.naskah.findMany({
          where: eq(naskah.userId, user.id),
          orderBy: desc(naskah.createdAt),
          with: { user: true }
        });
  return c.json({ data: rows.map(publicNaskah) });
});

naskahRoutes.post("/", zValidator("json", saveSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const validationMessage = validateContentParameters(body.jenis, body.parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const id = nanoid();
  const title = body.title?.trim() || titleFromParameters(body.jenis, body.parameters);
  const qualityReport = qualityReportFor(body.jenis, body.content, body.parameters);
  await db.insert(naskah).values({
    id,
    userId: user.id,
    title,
    jenis: body.jenis,
    bahasa: body.bahasa,
    duration: body.duration,
    parameters: body.parameters,
    content: body.content,
    status: body.status ?? "draft",
    version: 1,
    qualityScore: qualityReport.score,
    qualityReport
  });
  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (row) {
    await createVersionSnapshot({
      row,
      versionNumber: 1,
      qualityReport,
      changeSummary: body.changeSummary ?? "Versi awal"
    });
  }
  return c.json({ data: row ? publicNaskah(row) : null }, 201);
});

naskahRoutes.get("/:id", async (c) => {
  const row = await db.query.naskah.findFirst({
    where: eq(naskah.id, c.req.param("id")),
    with: { user: true }
  });
  if (!row) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, row.userId)) return c.json({ message: "Tidak berhak mengakses naskah ini." }, 403);
  return c.json({ data: publicNaskah(row) });
});

naskahRoutes.put("/:id", zValidator("json", saveSchema.partial()), async (c) => {
  const id = c.req.param("id");
  const existing = await db.query.naskah.findFirst({ where: eq(naskah.id, id) });
  if (!existing) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, existing.userId)) return c.json({ message: "Tidak berhak mengubah naskah ini." }, 403);

  const body = c.req.valid("json");
  if (body.jenis || body.parameters) {
    const nextJenis = body.jenis ?? existing.jenis;
    const nextParameters = body.parameters ?? existing.parameters;
    const validationMessage = validateContentParameters(nextJenis, nextParameters);
    if (validationMessage) return c.json({ message: validationMessage }, 400);
  }

  const { autosave, changeSummary, ...patchBody } = body;
  const nextJenis = patchBody.jenis ?? existing.jenis;
  const nextParameters = patchBody.parameters ?? existing.parameters;
  const nextContent = patchBody.content ?? existing.content;
  const qualityReport = qualityReportFor(nextJenis, nextContent, nextParameters);
  const shouldCreateVersion =
    !autosave &&
    Boolean(
      patchBody.title !== undefined ||
        patchBody.content !== undefined ||
        patchBody.parameters !== undefined ||
        patchBody.jenis !== undefined ||
        patchBody.bahasa !== undefined ||
        patchBody.duration !== undefined ||
        patchBody.status === "final"
    );
  const nextVersion = shouldCreateVersion ? existing.version + 1 : existing.version;

  await db
    .update(naskah)
    .set({
      ...patchBody,
      version: nextVersion,
      autosavedAt: autosave ? new Date().toISOString() : existing.autosavedAt,
      qualityScore: qualityReport.score,
      qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(and(eq(naskah.id, id), eq(naskah.userId, existing.userId)));

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (row && shouldCreateVersion) {
    await createVersionSnapshot({
      row,
      versionNumber: nextVersion,
      qualityReport,
      changeSummary: changeSummary ?? "Perubahan naskah"
    });
  }
  return c.json({ data: row ? publicNaskah(row) : null });
});

naskahRoutes.get("/:id/versions", async (c) => {
  const id = c.req.param("id");
  const existing = await db.query.naskah.findFirst({ where: eq(naskah.id, id) });
  if (!existing) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, existing.userId)) return c.json({ message: "Tidak berhak mengakses versi naskah ini." }, 403);

  const rows = await db.query.naskahVersions.findMany({
    where: eq(naskahVersions.naskahId, id),
    orderBy: desc(naskahVersions.versionNumber)
  });
  return c.json({ data: rows });
});

naskahRoutes.post("/:id/versions/:versionId/restore", async (c) => {
  const id = c.req.param("id");
  const versionId = c.req.param("versionId");
  const existing = await db.query.naskah.findFirst({ where: eq(naskah.id, id) });
  if (!existing) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, existing.userId)) return c.json({ message: "Tidak berhak mengembalikan versi naskah ini." }, 403);

  const version = await db.query.naskahVersions.findFirst({ where: and(eq(naskahVersions.id, versionId), eq(naskahVersions.naskahId, id)) });
  if (!version) return c.json({ message: "Versi naskah tidak ditemukan." }, 404);

  const restoredVersion = existing.version + 1;
  await db
    .update(naskah)
    .set({
      title: version.title,
      content: version.content,
      parameters: version.parameters,
      version: restoredVersion,
      qualityScore: version.qualityScore,
      qualityReport: version.qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(eq(naskah.id, id));

  const restored = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (restored) {
    await createVersionSnapshot({
      row: restored,
      versionNumber: restoredVersion,
      qualityReport: version.qualityReport,
      changeSummary: `Restore versi ${version.versionNumber}`
    });
  }

  return c.json({ data: restored ? publicNaskah(restored) : null });
});

naskahRoutes.post("/:id/refine", zValidator("json", refineSchema), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const existing = await db.query.naskah.findFirst({ where: eq(naskah.id, id) });
  if (!existing) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, existing.userId)) return c.json({ message: "Tidak berhak merevisi naskah ini." }, 403);

  const quota = await assertGenerateQuota(user.id);
  if (!quota.allowed) {
    await recordUsageEvent({ userId: user.id, eventType: "generate", status: "blocked", jenis: existing.jenis, route: "/api/naskah/:id/refine", metadata: { reason: "quota" } });
    return c.json({ message: quota.message }, 429);
  }

  const startedAt = Date.now();
  const content = await reviseNaskahContent({
    jenis: existing.jenis,
    parameters: existing.parameters,
    currentContent: existing.content,
    instruction: body.instruction,
    targetSection: body.targetSection
  });
  const qualityReport = qualityReportFor(existing.jenis, content, existing.parameters);
  const nextVersion = existing.version + 1;

  await db
    .update(naskah)
    .set({
      content,
      version: nextVersion,
      qualityScore: qualityReport.score,
      qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(eq(naskah.id, id));

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (row) {
    await createVersionSnapshot({
      row,
      versionNumber: nextVersion,
      qualityReport,
      changeSummary: body.targetSection ? `Revisi ${body.targetSection}` : "Revisi AI"
    });
  }

  await recordUsageEvent({
    userId: user.id,
    eventType: "generate",
    status: "ok",
    jenis: existing.jenis,
    route: "/api/naskah/:id/refine",
    durationMs: Date.now() - startedAt,
    metadata: { mode: "refine", qualityScore: qualityReport.score, wordCount: qualityReport.wordCount, quotaUsed: quota.used + 1, quotaLimit: quota.limit }
  });

  return c.json({ data: row ? publicNaskah(row) : null });
});

naskahRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await db.query.naskah.findFirst({ where: eq(naskah.id, id) });
  if (!existing) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, existing.userId)) return c.json({ message: "Tidak berhak menghapus naskah ini." }, 403);
  await db.delete(naskah).where(eq(naskah.id, id));
  return c.json({ ok: true });
});
