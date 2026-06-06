import { Hono } from "hono";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { naskah, templates, usageEvents, users } from "../db/schema";
import { adminRequired, authRequired, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
import { hashPassword } from "../utils/password";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", authRequired, adminRequired);

adminRoutes.get("/stats", async (c) => {
  const [userCount] = await db.select({ value: count() }).from(users);
  const [naskahCount] = await db.select({ value: count() }).from(naskah);
  const [templateCount] = await db.select({ value: count() }).from(templates);
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
