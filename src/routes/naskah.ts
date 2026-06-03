import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { naskah, type Naskah, type User } from "../db/schema";
import { authRequired, canAccessOwner, publicUser, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";

const saveSchema = z.object({
  title: z.string().min(3).optional(),
  jenis: z.enum(CONTENT_TYPES),
  bahasa: z.string().default("Indonesia"),
  duration: z.string().optional(),
  parameters: z.record(z.unknown()),
  content: z.string().min(20)
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
  await db.insert(naskah).values({
    id,
    userId: user.id,
    title,
    jenis: body.jenis,
    bahasa: body.bahasa,
    duration: body.duration,
    parameters: body.parameters,
    content: body.content
  });
  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
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

  await db
    .update(naskah)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(naskah.id, id), eq(naskah.userId, existing.userId)));

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, id), with: { user: true } });
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
