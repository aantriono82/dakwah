import { Hono } from "hono";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { curatedDalil, naskah, templates, usageEvents, users } from "../db/schema";
import { adminRequired, authRequired, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
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

adminRoutes.get("/stats", async (c) => {
  const [userCount] = await db.select({ value: count() }).from(users);
  const [naskahCount] = await db.select({ value: count() }).from(naskah);
  const [templateCount] = await db.select({ value: count() }).from(templates);
  const [dalilCount] = await db.select({ value: count() }).from(curatedDalil);
  const [todayGenerates] = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(and(eq(usageEvents.eventType, "generate"), eq(usageEvents.status, "ok"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`));
  const [todayExports] = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(and(eq(usageEvents.eventType, "export"), eq(usageEvents.status, "ok"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`));
  const [blockedGenerates] = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(and(eq(usageEvents.eventType, "generate"), eq(usageEvents.status, "blocked"), sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`));
  const byJenis = await db
    .select({ jenis: naskah.jenis, total: count() })
    .from(naskah)
    .groupBy(naskah.jenis)
    .orderBy(desc(sql`count(*)`));
  const usageByUser = await db
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
    .limit(10);
  const recentUsage = await db.query.usageEvents.findMany({
    orderBy: desc(usageEvents.createdAt),
    limit: 20,
    with: { user: true }
  });
  return c.json({
    data: {
      users: userCount.value,
      naskah: naskahCount.value,
      templates: templateCount.value,
      dalil: dalilCount.value,
      todayGenerates: todayGenerates.value,
      todayExports: todayExports.value,
      blockedGenerates: blockedGenerates.value,
      byJenis,
      usageByUser,
      recentUsage: recentUsage.map((event) => ({
        ...event,
        user: event.user ? publicUser(event.user) : null
      }))
    }
  });
});

adminRoutes.get("/dalil", async (c) => {
  const kind = c.req.query("kind");
  const status = c.req.query("status") ?? "active";
  const q = c.req.query("q")?.trim();
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

  const query = db
    .select()
    .from(curatedDalil)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(curatedDalil.updatedAt))
    .limit(200);

  return c.json({ data: await query });
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
