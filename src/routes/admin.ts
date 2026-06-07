import { Hono } from "hono";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { curatedDalil, naskah, templates, usageEvents, users } from "../db/schema";
import { adminRequired, authRequired, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
import { getMetricSummaries } from "../utils/observability";
import { hashPassword } from "../utils/password";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", authRequired, adminRequired);

const dalilBodySchema = z.object({
  kind: z.enum(["quran", "hadith"]),
  reference: z.string().min(2),
  arab: z.string().optional().nullable(),
  translation: z.string().min(3),
  source: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  takhrij: z.string().optional().nullable(),
  tafsir: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "reviewed", "approved", "archived"]).optional(),
  isActive: z.boolean().optional()
});

const dalilUpdateSchema = dalilBodySchema.partial();

function normalizeTags(tags: string[] | undefined) {
  return [
    ...new Set(
      (tags ?? [])
        .flatMap((item) => item.split(","))
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

function nullableText(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

type FrontendPerfWindow = "24h" | "7d" | "30d";

function frontendPerfWindowClause(window: FrontendPerfWindow) {
  if (window === "24h") return sql`${usageEvents.createdAt} >= datetime('now', '-1 day')`;
  if (window === "30d") return sql`${usageEvents.createdAt} >= datetime('now', '-30 day')`;
  return sql`${usageEvents.createdAt} >= datetime('now', '-7 day')`;
}

function previousFrontendPerfWindowClause(window: FrontendPerfWindow) {
  if (window === "24h") return sql`${usageEvents.createdAt} >= datetime('now', '-2 day') and ${usageEvents.createdAt} < datetime('now', '-1 day')`;
  if (window === "30d") return sql`${usageEvents.createdAt} >= datetime('now', '-60 day') and ${usageEvents.createdAt} < datetime('now', '-30 day')`;
  return sql`${usageEvents.createdAt} >= datetime('now', '-14 day') and ${usageEvents.createdAt} < datetime('now', '-7 day')`;
}

async function adminOverviewStats() {
  const [userCount, naskahCount, templateCount, dalilCount, byJenis] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(naskah),
    db.select({ value: count() }).from(templates),
    db.select({ value: count() }).from(curatedDalil),
    db
      .select({ jenis: naskah.jenis, total: count() })
      .from(naskah)
      .groupBy(naskah.jenis)
      .orderBy(desc(sql`count(*)`))
  ]);

  return {
    users: userCount[0]?.value ?? 0,
    naskah: naskahCount[0]?.value ?? 0,
    templates: templateCount[0]?.value ?? 0,
    dalil: dalilCount[0]?.value ?? 0,
    byJenis
  };
}

async function adminMonitoringStats(perfWindow: FrontendPerfWindow = "7d") {
  const [todayGenerates, todayExports, blockedGenerates, usageByUser, recentUsage, frontendPerfSummary, previousFrontendPerfSummary] = await Promise.all([
    db
      .select({ value: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.eventType, "generate"), eq(usageEvents.status, "ok"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`)),
    db
      .select({ value: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.eventType, "export"), eq(usageEvents.status, "ok"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`)),
    db
      .select({ value: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.eventType, "generate"), eq(usageEvents.status, "blocked"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`)),
    db
      .select({
        userId: usageEvents.userId,
        username: users.username,
        name: users.name,
        total: count()
      })
      .from(usageEvents)
      .leftJoin(users, eq(usageEvents.userId, users.id))
      .where(and(eq(usageEvents.eventType, "generate"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`))
      .groupBy(usageEvents.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db.query.usageEvents.findMany({
      orderBy: desc(usageEvents.createdAt),
      limit: 20,
      with: { user: true }
    }),
    db
      .select({
        page: usageEvents.route,
        count: count(),
        avgDurationMs: sql<number>`round(avg(${usageEvents.durationMs}))`,
        minDurationMs: sql<number>`min(${usageEvents.durationMs})`,
        maxDurationMs: sql<number>`max(${usageEvents.durationMs})`
      })
      .from(usageEvents)
      .where(and(eq(usageEvents.eventType, "frontend_page_load"), frontendPerfWindowClause(perfWindow)))
      .groupBy(usageEvents.route)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        page: usageEvents.route,
        count: count(),
        avgDurationMs: sql<number>`round(avg(${usageEvents.durationMs}))`
      })
      .from(usageEvents)
      .where(and(eq(usageEvents.eventType, "frontend_page_load"), previousFrontendPerfWindowClause(perfWindow)))
      .groupBy(usageEvents.route)
      .orderBy(desc(sql`count(*)`))
  ]);
  const metrics = getMetricSummaries()
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    todayGenerates: todayGenerates[0]?.value ?? 0,
    todayExports: todayExports[0]?.value ?? 0,
    blockedGenerates: blockedGenerates[0]?.value ?? 0,
    usageByUser,
    metrics,
    frontendPerfWindow: perfWindow,
    frontendPerfSummary: frontendPerfSummary
      .filter((item) => item.page)
      .map((item) => {
        const previous = previousFrontendPerfSummary.find((candidate) => candidate.page === item.page);
        return {
          ...item,
          previousAvgDurationMs: previous?.avgDurationMs ?? null,
          previousCount: previous?.count ?? 0
        };
      }),
    recentUsage: recentUsage.map((event) => ({
      ...event,
      user: event.user ? publicUser(event.user) : null
    }))
  };
}

adminRoutes.get("/stats", async (c) => {
  const scope = c.req.query("scope") ?? "all";
  const perfWindow = (() => {
    const value = c.req.query("perfWindow");
    return value === "24h" || value === "30d" ? value : "7d";
  })();

  if (scope === "overview") {
    return c.json({ data: await adminOverviewStats() });
  }

  if (scope === "monitoring") {
    return c.json({ data: await adminMonitoringStats(perfWindow) });
  }

  const [overview, monitoring] = await Promise.all([adminOverviewStats(), adminMonitoringStats(perfWindow)]);
  return c.json({ data: { ...overview, ...monitoring } });
});

adminRoutes.get("/dalil", async (c) => {
  const kind = c.req.query("kind");
  const status = c.req.query("status") ?? "active";
  const q = c.req.query("q")?.trim();
  const rawPage = Number(c.req.query("page") ?? "1");
  const rawPageSize = Number(c.req.query("pageSize") ?? "25");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(Math.floor(rawPageSize), 100) : 25;
  const offset = (page - 1) * pageSize;
  const filters = [];

  if (kind === "quran" || kind === "hadith") filters.push(eq(curatedDalil.kind, kind));
  if (status !== "all") filters.push(eq(curatedDalil.isActive, status !== "inactive"));
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        like(curatedDalil.reference, pattern),
        like(curatedDalil.translation, pattern),
        like(curatedDalil.source, pattern),
        like(curatedDalil.tags, pattern)
      )
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;
  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(curatedDalil)
      .where(whereClause)
      .orderBy(desc(curatedDalil.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(curatedDalil).where(whereClause)
  ]);

  return c.json({
    data: items,
    pagination: {
      page,
      pageSize,
      total: totalRows[0]?.value ?? 0,
      totalPages: Math.max(1, Math.ceil((totalRows[0]?.value ?? 0) / pageSize))
    }
  });
});

adminRoutes.post("/dalil", zValidator("json", dalilBodySchema), async (c) => {
  const body = c.req.valid("json");
  const id = nanoid();
  await db.insert(curatedDalil).values({
    id,
    kind: body.kind,
    reference: body.reference.trim(),
    arab: nullableText(body.arab),
    translation: body.translation.trim(),
    source: nullableText(body.source) ?? "Database dalil terkurasi",
    grade: nullableText(body.grade),
    takhrij: nullableText(body.takhrij),
    tafsir: nullableText(body.tafsir),
    tags: normalizeTags(body.tags),
    status: body.status ?? "draft",
    isActive: body.isActive ?? true
  });
  const row = await db.query.curatedDalil.findFirst({ where: eq(curatedDalil.id, id) });
  return c.json({ data: row }, 201);
});

adminRoutes.put("/dalil/:id", zValidator("json", dalilUpdateSchema), async (c) => {
  const body = c.req.valid("json");
  const patch: Partial<typeof curatedDalil.$inferInsert> = {
    updatedAt: new Date().toISOString()
  };

  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.reference !== undefined) patch.reference = body.reference.trim();
  if (body.arab !== undefined) patch.arab = nullableText(body.arab);
  if (body.translation !== undefined) patch.translation = body.translation.trim();
  if (body.source !== undefined) patch.source = nullableText(body.source) ?? "Database dalil terkurasi";
  if (body.grade !== undefined) patch.grade = nullableText(body.grade);
  if (body.takhrij !== undefined) patch.takhrij = nullableText(body.takhrij);
  if (body.tafsir !== undefined) patch.tafsir = nullableText(body.tafsir);
  if (body.tags !== undefined) patch.tags = normalizeTags(body.tags);
  if (body.status !== undefined) patch.status = body.status;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  await db.update(curatedDalil).set(patch).where(eq(curatedDalil.id, c.req.param("id")));
  const row = await db.query.curatedDalil.findFirst({ where: eq(curatedDalil.id, c.req.param("id")) });
  if (!row) return c.json({ message: "Dalil tidak ditemukan." }, 404);
  return c.json({ data: row });
});

adminRoutes.delete("/dalil/:id", async (c) => {
  await db.delete(curatedDalil).where(eq(curatedDalil.id, c.req.param("id")));
  return c.json({ ok: true });
});

adminRoutes.get("/users", async (c) => {
  const rows = await db.query.users.findMany({ orderBy: desc(users.createdAt) });
  return c.json({ data: rows.map(publicUser) });
});

adminRoutes.post(
  "/users",
  zValidator(
    "json",
    z.object({
      username: z.string().min(3),
      name: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "user"]),
      dailyGenerateLimit: z.number().int().min(0).nullable().optional()
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const id = nanoid();
    try {
      await db.insert(users).values({
        id,
        username: body.username,
        name: body.name,
        role: body.role,
        dailyGenerateLimit: body.dailyGenerateLimit,
        passwordHash: await hashPassword(body.password)
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return c.json({ message: "Username sudah digunakan." }, 409);
      throw error;
    }
    const row = await db.query.users.findFirst({ where: eq(users.id, id) });
    return c.json({ data: row ? publicUser(row) : null }, 201);
  }
);

adminRoutes.put(
  "/users/:id",
  zValidator(
    "json",
    z.object({
      username: z.string().min(3).optional(),
      name: z.string().min(3).optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["admin", "user"]).optional(),
      dailyGenerateLimit: z.number().int().min(0).nullable().optional()
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const patch: Partial<typeof users.$inferInsert> = {
      username: body.username,
      name: body.name,
      role: body.role,
      dailyGenerateLimit: body.dailyGenerateLimit,
      updatedAt: new Date().toISOString()
    };
    if (body.password) patch.passwordHash = await hashPassword(body.password);
    try {
      await db.update(users).set(patch).where(eq(users.id, c.req.param("id")));
    } catch (error) {
      if (isUniqueConstraintError(error)) return c.json({ message: "Username sudah digunakan." }, 409);
      throw error;
    }
    const row = await db.query.users.findFirst({ where: eq(users.id, c.req.param("id")) });
    return c.json({ data: row ? publicUser(row) : null });
  }
);

adminRoutes.delete("/users/:id", async (c) => {
  if (c.req.param("id") === c.get("user").id) return c.json({ message: "Tidak bisa menghapus akun sendiri." }, 400);
  await db.delete(users).where(eq(users.id, c.req.param("id")));
  return c.json({ ok: true });
});
