import { Hono } from "hono";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, sqlite } from "../db/client";
import { naskah, naskahVersions, users, type Naskah, type QualityReport, type User } from "../db/schema";
import { isMeaningfullyDifferentRevision, reviseNaskahContent } from "../services/openai";
import { retrieveDalilContext } from "../services/myquran";
import { assertGenerateQuota, recordUsageEvent } from "../services/usage";
import { authRequired, canAccessOwner, publicUser, type AppEnv, type PublicUser } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { logInfo } from "../utils/observability";
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
  targetSection: z.string().trim().max(120).optional(),
  changeSummary: z.string().trim().min(3).max(160).optional()
});

export const naskahRoutes = new Hono<AppEnv>();
naskahRoutes.use("*", authRequired);
const defaultListPageSize = 25;
const maxListPageSize = 100;

type NaskahRow = Naskah & { user?: User | null };
type NaskahVersionRow = typeof naskahVersions.$inferSelect;
type NaskahSummaryRow = Pick<
  Naskah,
  | "id"
  | "userId"
  | "title"
  | "jenis"
  | "bahasa"
  | "duration"
  | "fileUrl"
  | "fileKey"
  | "pdfFileUrl"
  | "pdfFileKey"
  | "pdfExportedAt"
  | "docxFileUrl"
  | "docxFileKey"
  | "docxExportedAt"
  | "status"
  | "version"
  | "autosavedAt"
  | "qualityScore"
  | "createdAt"
  | "updatedAt"
> & { user?: PublicUser | null };

function publicNaskah(row: NaskahRow) {
  return {
    ...row,
    user: row.user ? publicUser(row.user) : row.user
  };
}

function summaryNaskah(row: NaskahSummaryRow) {
  return {
    ...row,
    parameters: {},
    content: "",
    qualityReport: null
  };
}

function selectNaskahSummaryRows(where: SQL | undefined, pageSize?: number, offset?: number) {
  const query = db
    .select({
      id: naskah.id,
      userId: naskah.userId,
      title: naskah.title,
      jenis: naskah.jenis,
      bahasa: naskah.bahasa,
      duration: naskah.duration,
      fileUrl: naskah.fileUrl,
      fileKey: naskah.fileKey,
      pdfFileUrl: naskah.pdfFileUrl,
      pdfFileKey: naskah.pdfFileKey,
      pdfExportedAt: naskah.pdfExportedAt,
      docxFileUrl: naskah.docxFileUrl,
      docxFileKey: naskah.docxFileKey,
      docxExportedAt: naskah.docxExportedAt,
      status: naskah.status,
      version: naskah.version,
      autosavedAt: naskah.autosavedAt,
      qualityScore: naskah.qualityScore,
      createdAt: naskah.createdAt,
      updatedAt: naskah.updatedAt,
      user: {
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        dailyGenerateLimit: users.dailyGenerateLimit
      }
    })
    .from(naskah)
    .leftJoin(users, eq(naskah.userId, users.id))
    .orderBy(desc(naskah.createdAt));

  const filteredQuery = where ? query.where(where) : query;
  if (pageSize !== undefined) return filteredQuery.limit(pageSize).offset(offset ?? 0);
  return filteredQuery;
}

async function selectNaskahSummaryRowsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: naskah.id,
      userId: naskah.userId,
      title: naskah.title,
      jenis: naskah.jenis,
      bahasa: naskah.bahasa,
      duration: naskah.duration,
      fileUrl: naskah.fileUrl,
      fileKey: naskah.fileKey,
      pdfFileUrl: naskah.pdfFileUrl,
      pdfFileKey: naskah.pdfFileKey,
      pdfExportedAt: naskah.pdfExportedAt,
      docxFileUrl: naskah.docxFileUrl,
      docxFileKey: naskah.docxFileKey,
      docxExportedAt: naskah.docxExportedAt,
      status: naskah.status,
      version: naskah.version,
      autosavedAt: naskah.autosavedAt,
      qualityScore: naskah.qualityScore,
      createdAt: naskah.createdAt,
      updatedAt: naskah.updatedAt,
      user: {
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        dailyGenerateLimit: users.dailyGenerateLimit
      }
    })
    .from(naskah)
    .leftJoin(users, eq(naskah.userId, users.id))
    .where(inArray(naskah.id, ids));
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const orderedRows: typeof rows = [];
  for (const id of ids) {
    const row = rowMap.get(id);
    if (row) orderedRows.push(row);
  }
  return orderedRows;
}

function summaryVersion(row: NaskahVersionRow) {
  return {
    id: row.id,
    naskahId: row.naskahId,
    versionNumber: row.versionNumber,
    title: row.title,
    qualityScore: row.qualityScore,
    changeSummary: row.changeSummary,
    createdAt: row.createdAt
  };
}

function resetExportCacheFields() {
  return {
    fileUrl: null,
    fileKey: null,
    pdfFileUrl: null,
    pdfFileKey: null,
    pdfExportedAt: null,
    docxFileUrl: null,
    docxFileKey: null,
    docxExportedAt: null
  } as const;
}

function syncNaskahSearchIndex(row: Pick<Naskah, "id" | "title" | "jenis" | "bahasa" | "duration">) {
  sqlite.run("DELETE FROM naskah_search WHERE id = ?", [row.id]);
  sqlite.run(
    "INSERT INTO naskah_search (id, title, jenis, bahasa, duration) VALUES (?, ?, ?, ?, ?)",
    [row.id, row.title, row.jenis, row.bahasa, row.duration ?? ""]
  );
}

function removeNaskahSearchIndex(id: string) {
  sqlite.run("DELETE FROM naskah_search WHERE id = ?", [id]);
}

function buildNaskahSearchMatch(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(" ");
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
  const summaryOnly = c.req.query("summary") === "1";
  const query = c.req.query("q")?.trim();
  const pageQuery = Number(c.req.query("page") ?? "");
  const pageSizeQuery = Number(c.req.query("pageSize") ?? "");
  const paginated = Number.isFinite(pageQuery) || Number.isFinite(pageSizeQuery);
  const page = Number.isFinite(pageQuery) && pageQuery > 0 ? Math.floor(pageQuery) : 1;
  const pageSize = Number.isFinite(pageSizeQuery)
    ? Math.min(maxListPageSize, Math.max(1, Math.floor(pageSizeQuery)))
    : defaultListPageSize;
  const ownershipWhere = user.role === "admin" ? undefined : eq(naskah.userId, user.id);
  const where = ownershipWhere;

  if (query) {
    const match = buildNaskahSearchMatch(query);
    if (!match) {
      return c.json({
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 1
        }
      });
    }

    const idRows =
      user.role === "admin"
        ? (sqlite
            .prepare(
              `
                SELECT n.id
                FROM naskah_search
                JOIN naskah n ON n.id = naskah_search.id
                WHERE naskah_search MATCH ?
                ORDER BY bm25(naskah_search), n.created_at DESC
                LIMIT ? OFFSET ?
              `
            )
            .all(match, pageSize, (page - 1) * pageSize) as Array<{ id: string }>)
        : (sqlite
            .prepare(
              `
                SELECT n.id
                FROM naskah_search
                JOIN naskah n ON n.id = naskah_search.id
                WHERE naskah_search MATCH ? AND n.user_id = ?
                ORDER BY bm25(naskah_search), n.created_at DESC
                LIMIT ? OFFSET ?
              `
            )
            .all(match, user.id, pageSize, (page - 1) * pageSize) as Array<{ id: string }>);

    const totalResult =
      user.role === "admin"
        ? (sqlite
            .prepare(
              `
                SELECT COUNT(*) AS value
                FROM naskah_search
                JOIN naskah n ON n.id = naskah_search.id
                WHERE naskah_search MATCH ?
              `
            )
            .get(match) as { value: number } | null)
        : (sqlite
            .prepare(
              `
                SELECT COUNT(*) AS value
                FROM naskah_search
                JOIN naskah n ON n.id = naskah_search.id
                WHERE naskah_search MATCH ? AND n.user_id = ?
              `
            )
            .get(match, user.id) as { value: number } | null);
    const total = totalResult?.value ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return c.json({
        data: [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      });
    }

    if (summaryOnly) {
      const rows = await selectNaskahSummaryRowsByIds(ids);
      return c.json({
        data: rows.map(summaryNaskah),
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      });
    }

    const rows = await db.query.naskah.findMany({
      where: inArray(naskah.id, ids),
      with: { user: true }
    });
    const rowMap = new Map(rows.map((row) => [row.id, row]));
    const orderedRows: typeof rows = [];
    for (const id of ids) {
      const row = rowMap.get(id);
      if (row) orderedRows.push(row);
    }
    return c.json({
      data: orderedRows.map(publicNaskah),
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  }

  if (summaryOnly) {
    const rows = await selectNaskahSummaryRows(where, paginated ? pageSize : undefined, paginated ? (page - 1) * pageSize : undefined);

    if (!paginated) {
      return c.json({ data: rows.map(summaryNaskah) });
    }

    const totalResult = where
      ? await db.select({ value: count() }).from(naskah).where(where)
      : await db.select({ value: count() }).from(naskah);
    const total = totalResult[0]?.value ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return c.json({
      data: rows.map(summaryNaskah),
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  }

  const rows = await db.query.naskah.findMany({
    where,
    orderBy: desc(naskah.createdAt),
    with: { user: true },
    ...(paginated ? { limit: pageSize, offset: (page - 1) * pageSize } : {})
  });

  if (!paginated) {
    return c.json({ data: rows.map(publicNaskah) });
  }

  const totalResult = where
    ? await db.select({ value: count() }).from(naskah).where(where)
    : await db.select({ value: count() }).from(naskah);
  const total = totalResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return c.json({
    data: rows.map(publicNaskah),
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
});

naskahRoutes.post("/", zValidator("json", saveSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const validationMessage = validateContentParameters(body.jenis, body.parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const id = nanoid();
  const title = body.title?.trim() || titleFromParameters(body.jenis, body.parameters);
  const dalilContext = await retrieveDalilContext(body.jenis, body.parameters);
  const qualityReport = qualityReportFor(body.jenis, body.content, body.parameters, dalilContext);
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
    syncNaskahSearchIndex(row);
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

naskahRoutes.get("/:id/context", async (c) => {
  const id = c.req.param("id");
  const row = await db.query.naskah.findFirst({
    where: eq(naskah.id, id),
    with: { user: true }
  });
  if (!row) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, row.userId)) return c.json({ message: "Tidak berhak mengakses naskah ini." }, 403);

  const versions = await db.query.naskahVersions.findMany({
    where: eq(naskahVersions.naskahId, id),
    orderBy: desc(naskahVersions.versionNumber)
  });

  return c.json({
    data: publicNaskah(row),
    versions: versions.map(summaryVersion)
  });
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
  const shouldInvalidateExportCache =
    (patchBody.title !== undefined && patchBody.title !== existing.title) ||
    (patchBody.content !== undefined && patchBody.content !== existing.content);
  const shouldRecomputeQuality =
    !autosave &&
    Boolean(
      patchBody.content !== undefined ||
        patchBody.parameters !== undefined ||
        patchBody.jenis !== undefined
    );
  let qualityReport = existing.qualityReport;
  let qualityScore = existing.qualityScore;
  if (shouldRecomputeQuality) {
    const dalilContext = await retrieveDalilContext(nextJenis, nextParameters);
    const generatedQualityReport = qualityReportFor(nextJenis, nextContent, nextParameters, dalilContext);
    qualityReport = generatedQualityReport;
    qualityScore = generatedQualityReport.score;
  }

  await db
    .update(naskah)
    .set({
      ...patchBody,
      ...(shouldInvalidateExportCache ? resetExportCacheFields() : {}),
      version: nextVersion,
      autosavedAt: autosave ? new Date().toISOString() : existing.autosavedAt,
      qualityScore,
      qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(and(eq(naskah.id, id), eq(naskah.userId, existing.userId)));

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (row && shouldCreateVersion) {
    syncNaskahSearchIndex(row);
    await createVersionSnapshot({
      row,
      versionNumber: nextVersion,
      qualityReport,
      changeSummary: changeSummary ?? "Perubahan naskah"
    });
  } else if (row) {
    syncNaskahSearchIndex(row);
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
  return c.json({ data: rows.map(summaryVersion) });
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
      ...resetExportCacheFields(),
      version: restoredVersion,
      qualityScore: version.qualityScore,
      qualityReport: version.qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(eq(naskah.id, id));

  const restored = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (restored) {
    syncNaskahSearchIndex(restored);
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
  const dalilContext = await retrieveDalilContext(existing.jenis, existing.parameters);
  const dalilRetrievedAt = Date.now();
  const content = await reviseNaskahContent({
    jenis: existing.jenis,
    parameters: existing.parameters,
    currentContent: existing.content,
    instruction: body.instruction,
    targetSection: body.targetSection,
    dalilContext
  });
  const revisedAt = Date.now();
  if (!isMeaningfullyDifferentRevision(existing.content, content)) {
    await recordUsageEvent({
      userId: user.id,
      eventType: "generate",
      status: "error",
      jenis: existing.jenis,
      route: "/api/naskah/:id/refine",
      durationMs: Date.now() - startedAt,
      metadata: {
        mode: "refine",
        reason: "unchanged_output"
      }
    });
    return c.json({ message: "Revisi AI tidak menghasilkan perubahan. Coba instruksi yang lebih spesifik atau periksa konfigurasi provider AI." }, 409);
  }
  const qualityReport = qualityReportFor(existing.jenis, content, existing.parameters, dalilContext);
  const nextVersion = existing.version + 1;
  logInfo("naskah.refine", {
    route: "/api/naskah/:id/refine",
    naskahId: existing.id,
    jenis: existing.jenis,
    userId: user.id,
    dalilMs: dalilRetrievedAt - startedAt,
    reviseMs: revisedAt - dalilRetrievedAt,
    qualityMs: Date.now() - revisedAt,
    totalMs: Date.now() - startedAt,
    qualityScore: qualityReport.score,
    wordCount: qualityReport.wordCount
  });

  await db
    .update(naskah)
    .set({
      content,
      ...resetExportCacheFields(),
      version: nextVersion,
      qualityScore: qualityReport.score,
      qualityReport,
      updatedAt: new Date().toISOString()
    })
    .where(eq(naskah.id, id));

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
  if (row) {
    syncNaskahSearchIndex(row);
    await createVersionSnapshot({
      row,
      versionNumber: nextVersion,
      qualityReport,
      changeSummary: body.changeSummary ?? (body.targetSection ? `Revisi ${body.targetSection}` : "Revisi AI")
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
  removeNaskahSearchIndex(id);
  return c.json({ ok: true });
});
