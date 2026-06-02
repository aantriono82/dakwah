import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, users, type User } from "../db/schema";

export type AppEnv = {
  Variables: {
    user: PublicUser;
  };
};

export type PublicUser = Pick<User, "id" | "username" | "name" | "role">;

export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  };
}

export async function authRequired(c: Context<AppEnv>, next: Next) {
  const sessionId = getCookie(c, "khutbah_session");
  if (!sessionId) return c.json({ message: "Belum login." }, 401);

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())),
    with: { user: true }
  });

  if (!session?.user) return c.json({ message: "Session tidak valid." }, 401);
  c.set("user", publicUser(session.user));
  await next();
}

export async function adminRequired(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ message: "Akses admin diperlukan." }, 403);
  await next();
}

export function canAccessOwner(c: Context<AppEnv>, ownerId: string) {
  const user = c.get("user");
  return user.role === "admin" || user.id === ownerId;
}

export function parseJsonBody<T>(body: unknown, fallback: T): T {
  if (!body) return fallback;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return fallback;
    }
  }
  return body as T;
}
