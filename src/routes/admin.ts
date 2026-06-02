import { Hono } from "hono";
import { count, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { naskah, templates, users } from "../db/schema";
import { adminRequired, authRequired, publicUser, type AppEnv } from "../utils/http";
import { hashPassword } from "../utils/password";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", authRequired, adminRequired);

adminRoutes.get("/stats", async (c) => {
  const [userCount] = await db.select({ value: count() }).from(users);
  const [naskahCount] = await db.select({ value: count() }).from(naskah);
  const [templateCount] = await db.select({ value: count() }).from(templates);
  const byJenis = await db
    .select({ jenis: naskah.jenis, total: count() })
    .from(naskah)
    .groupBy(naskah.jenis)
    .orderBy(desc(sql`count(*)`));
  return c.json({
    data: {
      users: userCount.value,
      naskah: naskahCount.value,
      templates: templateCount.value,
      byJenis
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
      role: z.enum(["admin", "user"])
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const id = nanoid();
    await db.insert(users).values({
      id,
      username: body.username,
      name: body.name,
      role: body.role,
      passwordHash: await hashPassword(body.password)
    });
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
      role: z.enum(["admin", "user"]).optional()
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const patch: Partial<typeof users.$inferInsert> = {
      username: body.username,
      name: body.name,
      role: body.role,
      updatedAt: new Date().toISOString()
    };
    if (body.password) patch.passwordHash = await hashPassword(body.password);
    await db.update(users).set(patch).where(eq(users.id, c.req.param("id")));
    const row = await db.query.users.findFirst({ where: eq(users.id, c.req.param("id")) });
    return c.json({ data: row ? publicUser(row) : null });
  }
);

adminRoutes.delete("/users/:id", async (c) => {
  if (c.req.param("id") === c.get("user").id) return c.json({ message: "Tidak bisa menghapus akun sendiri." }, 400);
  await db.delete(users).where(eq(users.id, c.req.param("id")));
  return c.json({ ok: true });
});
