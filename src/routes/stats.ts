import { Hono } from "hono";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { naskah, templates, users } from "../db/schema";
import { dailyGenerateCount, generateLimitFor, recordUsageEvent } from "../services/usage";
import { authRequired, type AppEnv } from "../utils/http";

export const statsRoutes = new Hono<AppEnv>();
statsRoutes.use("*", authRequired);

const frontendPerfSchema = z.object({
  page: z.enum(["Generate", "History", "AdminMonitoring"]),
  durationMs: z.number().finite().min(0).max(120000),
  recordedAt: z.string().datetime().optional()
});

statsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const [fullUser, naskahCount, templateCount, recent] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, user.id) }),
    db.select({ value: count() }).from(naskah).where(eq(naskah.userId, user.id)),
    db.select({ value: count() }).from(templates).where(eq(templates.userId, user.id)),
    db.query.naskah.findMany({
      where: eq(naskah.userId, user.id),
      limit: 5,
      orderBy: (table, { desc }) => [desc(table.createdAt)]
    })
  ]);
  const quota = fullUser
    ? {
        generateUsedToday: await dailyGenerateCount(user.id),
        generateLimit: generateLimitFor(fullUser)
      }
    : null;

  return c.json({
    data: {
      naskah: naskahCount[0]?.value ?? 0,
      templates: templateCount[0]?.value ?? 0,
      quota,
      recent
    }
  });
});

statsRoutes.post(
  "/frontend-perf",
  zValidator("json", frontendPerfSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    await recordUsageEvent({
      userId: user.id,
      eventType: "frontend_page_load",
      status: "ok",
      route: body.page,
      durationMs: Math.round(body.durationMs),
      metadata: {
        source: "frontend",
        recordedAt: body.recordedAt ?? new Date().toISOString()
      }
    });

    return c.json({ ok: true });
  }
);
