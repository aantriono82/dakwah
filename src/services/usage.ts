import { and, count, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { defaultDailyGenerateLimit } from "../config";
import { db } from "../db/client";
import { usageEvents, users, type User } from "../db/schema";

export async function recordUsageEvent(input: {
  userId?: string | null;
  eventType: string;
  status?: "ok" | "error" | "blocked";
  jenis?: string;
  route?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(usageEvents).values({
    id: nanoid(),
    userId: input.userId ?? null,
    eventType: input.eventType,
    status: input.status ?? "ok",
    jenis: input.jenis,
    route: input.route,
    durationMs: input.durationMs,
    metadata: input.metadata
  });
}

export async function dailyGenerateCount(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.eventType, "generate"),
        eq(usageEvents.status, "ok"),
        sql`${usageEvents.createdAt} >= datetime('now', 'start of day')`
      )
    );
  return row?.value ?? 0;
}

export function generateLimitFor(user: Pick<User, "dailyGenerateLimit">) {
  const limit = user.dailyGenerateLimit ?? defaultDailyGenerateLimit;
  return limit > 0 ? limit : null;
}

export async function assertGenerateQuota(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return { allowed: false as const, message: "User tidak ditemukan." };

  const limit = generateLimitFor(user);
  if (!limit) return { allowed: true as const, limit: null, used: await dailyGenerateCount(userId) };

  const used = await dailyGenerateCount(userId);
  if (used >= limit) {
    return {
      allowed: false as const,
      message: `Quota generate harian sudah habis (${used}/${limit}). Coba lagi besok atau hubungi admin.`,
      limit,
      used
    };
  }

  return { allowed: true as const, limit, used };
}
