import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { eq, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { passwordResetTokens, sessions, users } from "../db/schema";
import { appPublicUrl, authCookieDomain, authCookieSameSite, authCookieSecure, authRateLimitMax, authRateLimitWindowMs } from "../config";
import { sendPasswordResetEmail } from "../services/email";
import { authRequired, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
import { hashPassword, sha256, verifyPassword } from "../utils/password";
import { rateLimit, rateLimitKeyByIp } from "../utils/rate-limit";

export const authRoutes = new Hono<AppEnv>();

const authCookieMaxAge = 60 * 60 * 24 * 7;
const captchaTtlMs = 5 * 60 * 1000;
const passwordResetTtlMs = 30 * 60 * 1000;
const captchaChallenges = new Map<string, { answer: number; expiresAt: number }>();

authRoutes.use(
  "/login",
  rateLimit({ keyPrefix: "auth:login", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
);
authRoutes.use(
  "/captcha",
  rateLimit({ keyPrefix: "auth:captcha", windowMs: authRateLimitWindowMs, max: Math.max(authRateLimitMax, 60), key: rateLimitKeyByIp })
);
authRoutes.use(
  "/register",
  rateLimit({ keyPrefix: "auth:register", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
);
authRoutes.use(
  "/forgot-password",
  rateLimit({ keyPrefix: "auth:forgot", windowMs: authRateLimitWindowMs, max: Math.max(5, Math.ceil(authRateLimitMax / 2)), key: rateLimitKeyByIp })
);
authRoutes.use(
  "/reset-password",
  rateLimit({ keyPrefix: "auth:reset", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
);

function cleanupCaptchaChallenges() {
  const now = Date.now();
  for (const [token, challenge] of captchaChallenges) {
    if (challenge.expiresAt <= now) captchaChallenges.delete(token);
  }
}

function createCaptchaChallenge() {
  cleanupCaptchaChallenges();

  const a = Math.floor(Math.random() * 8) + 3;
  const b = Math.floor(Math.random() * 6) + 2;
  const c = Math.floor(Math.random() * 15) + 6;
  const d = Math.floor(Math.random() * 7) + 3;
  const variants = [
    { question: `${a} x ${b} + ${c}`, answer: a * b + c },
    { question: `${c} + ${a} x ${b}`, answer: c + a * b },
    { question: `(${a} + ${b}) x ${d}`, answer: (a + b) * d },
    { question: `${a} x (${b} + ${d})`, answer: a * (b + d) },
    { question: `${a} + ${b} + ${c}`, answer: a + b + c }
  ];
  const selected = variants[Math.floor(Math.random() * variants.length)];
  const token = nanoid(32);

  captchaChallenges.set(token, { answer: selected.answer, expiresAt: Date.now() + captchaTtlMs });
  return { token, question: selected.question };
}

function verifyCaptcha(token: string, answer: string) {
  cleanupCaptchaChallenges();

  const challenge = captchaChallenges.get(token);
  captchaChallenges.delete(token);

  if (!challenge) return false;
  return Number(answer) === challenge.answer;
}

async function createSession(c: Context<AppEnv>, userId: string) {
  const sessionId = nanoid(48);
  const expiresAt = new Date(Date.now() + 1000 * authCookieMaxAge);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });

  setCookie(c, "khutbah_session", sessionId, {
    httpOnly: true,
    sameSite: authCookieSameSite,
    secure: authCookieSecure || authCookieSameSite === "None",
    domain: authCookieDomain,
    path: "/",
    maxAge: authCookieMaxAge
  });
}

async function cleanupExpiredAuthRows() {
  const now = new Date();
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
  await db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, now));
}

authRoutes.post("/login", async (c) => {
  await cleanupExpiredAuthRows();
  const body = await c.req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ message: "Username atau password salah." }, 401);
  }

  await createSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

authRoutes.get("/captcha", (c) => c.json(createCaptchaChallenge()));

authRoutes.post(
  "/forgot-password",
  zValidator("json", z.object({ email: z.string().trim().email("Email tidak valid.") })),
  async (c) => {
    const body = c.req.valid("json");
    const email = body.email.toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.username, email) });
    const responseBody: { message: string; resetUrl?: string } = {
      message: "Jika email terdaftar, instruksi reset kata sandi akan dikirim."
    };

    if (user) {
      await cleanupExpiredAuthRows();
      const token = nanoid(48);
      const tokenHash = await sha256(token);
      const resetUrl = `${appPublicUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
      await db.insert(passwordResetTokens).values({
        id: nanoid(),
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + passwordResetTtlMs)
      });

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (error) {
        console.warn(error instanceof Error ? error.message : "Gagal mengirim email reset password.");
      }

      if (process.env.NODE_ENV !== "production" && process.env.RESET_PASSWORD_DEBUG_LINK === "true") responseBody.resetUrl = resetUrl;
    }

    return c.json(responseBody);
  }
);

authRoutes.post(
  "/reset-password",
  zValidator(
    "json",
    z.object({
      token: z.string().min(16, "Token reset tidak valid."),
      password: z.string().min(6, "Kata sandi minimal 6 karakter.")
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    await cleanupExpiredAuthRows();
    const tokenHash = await sha256(body.token);
    const resetToken = await db.query.passwordResetTokens.findFirst({ where: eq(passwordResetTokens.tokenHash, tokenHash) });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
      return c.json({ message: "Token reset tidak valid atau sudah kedaluwarsa." }, 400);
    }

    await db.update(users).set({ passwordHash: await hashPassword(body.password), updatedAt: new Date().toISOString() }).where(eq(users.id, resetToken.userId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));
    await db.delete(sessions).where(eq(sessions.userId, resetToken.userId));

    return c.json({ message: "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru." });
  }
);

authRoutes.post(
  "/register",
  zValidator(
    "json",
    z.object({
      email: z.string().trim().email("Email tidak valid."),
      name: z.string().trim().min(3, "Nama minimal 3 karakter."),
      password: z.string().min(6, "Kata sandi minimal 6 karakter."),
      captchaToken: z.string().min(1, "Captcha tidak valid."),
      captchaAnswer: z.string().regex(/^-?\d+$/, "Jawaban captcha harus berupa angka.")
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const id = nanoid();
    const username = body.email.toLowerCase();

    if (!verifyCaptcha(body.captchaToken, body.captchaAnswer)) {
      return c.json({ message: "Jawaban captcha belum benar." }, 400);
    }

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
  deleteCookie(c, "khutbah_session", { path: "/", domain: authCookieDomain });
  return c.json({ ok: true });
});

authRoutes.get("/me", authRequired, (c) => c.json({ user: c.get("user") }));
