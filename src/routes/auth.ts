import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";
import { authRequired, publicUser, type AppEnv } from "../utils/http";
import { verifyPassword } from "../utils/password";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ message: "Username atau password salah." }, 401);
  }

  const sessionId = nanoid(48);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt });

  setCookie(c, "khutbah_session", sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return c.json({ user: publicUser(user) });
});

authRoutes.post("/logout", authRequired, async (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const sessionId = cookie.match(/khutbah_session=([^;]+)/)?.[1];
  if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, "khutbah_session", { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", authRequired, (c) => c.json({ user: c.get("user") }));
