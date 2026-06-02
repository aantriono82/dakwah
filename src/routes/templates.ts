import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { templates } from "../db/schema";
import { authRequired, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, validateContentParameters } from "../utils/content";

const templateSchema = z.object({
  name: z.string().min(3),
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown())
});

export const templateRoutes = new Hono<AppEnv>();
templateRoutes.use("*", authRequired);

templateRoutes.get("/", async (c) => {
  const user = c.get("user");
  const data = await db.query.templates.findMany({
    where: eq(templates.userId, user.id),
    orderBy: desc(templates.createdAt)
  });
  return c.json({ data });
});

templateRoutes.post("/", zValidator("json", templateSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const validationMessage = validateContentParameters(body.jenis, body.parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const id = nanoid();
  await db.insert(templates).values({ id, userId: user.id, ...body });
  const row = await db.query.templates.findFirst({ where: eq(templates.id, id) });
  return c.json({ data: row }, 201);
});

templateRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  await db.delete(templates).where(and(eq(templates.id, c.req.param("id")), eq(templates.userId, user.id)));
  return c.json({ ok: true });
});
