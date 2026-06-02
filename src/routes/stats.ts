import { Hono } from "hono";
import { count, eq } from "drizzle-orm";
import { db } from "../db/client";
import { naskah, templates } from "../db/schema";
import { authRequired, type AppEnv } from "../utils/http";

export const statsRoutes = new Hono<AppEnv>();
statsRoutes.use("*", authRequired);

statsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const [naskahCount] = await db.select({ value: count() }).from(naskah).where(eq(naskah.userId, user.id));
  const [templateCount] = await db.select({ value: count() }).from(templates).where(eq(templates.userId, user.id));
  const recent = await db.query.naskah.findMany({
    where: eq(naskah.userId, user.id),
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.createdAt)]
  });
  return c.json({
    data: {
      naskah: naskahCount.value,
      templates: templateCount.value,
      recent
    }
  });
});
