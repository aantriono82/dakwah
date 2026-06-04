import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";
import { authRequired, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
import { hashPassword, verifyPassword } from "../utils/password";

export const authRoutes = new Hono<AppEnv>();

const authCookieMaxAge = 60 * 60 * 24 * 7;

async function createSession(c: Context<AppEnv>, userId: string) {
  const sessionId = nanoid(48);
  const expiresAt = new Date(Date.now() + 1000 * authCookieMaxAge);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });

  setCookie(c, "khutbah_session", sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: authCookieMaxAge
  });
}

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ message: "Username atau password salah." }, 401);
  }

  await createSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

authRoutes.post(
  "/register",
  zValidator(
    "json",
    z.object({
      email: z.string().trim().email("Email tidak valid."),
      name: z.string().trim().min(3, "Nama minimal 3 karakter."),
      password: z.string().min(6, "Kata sandi minimal 6 karakter.")
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const id = nanoid();
    const username = body.email.toLowerCase();

    try {
      await db.insert(users).values({
        id,
        username,
        name: body.name,
        role: "user",
        passwordHash: await hashPassword(body.password)
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return c.json({ message: "Email sudah digunakan." }, 409);
      throw error;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return c.json({ message: "Registrasi gagal." }, 500);

    await createSession(c, user.id);
    return c.json({ user: publicUser(user) }, 201);
  }
);

authRoutes.post("/logout", authRequired, async (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const sessionId = cookie.match(/khutbah_session=([^;]+)/)?.[1];
  if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, "khutbah_session", { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", authRequired, (c) => c.json({ user: c.get("user") }));
