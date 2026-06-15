import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { eq, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { passwordResetTokens, sessions, users } from "../db/schema";
import {
  appPublicUrl,
  authCookieDomain,
  authCookieSameSite,
  authCookieSecure,
  authRateLimitMax,
  authRateLimitWindowMs,
  googleOAuthClientId,
  googleOAuthClientSecret,
  googleOAuthEnabled,
  googleOAuthRedirectUrl,
  turnstileEnabled
} from "../config";
import { sendPasswordResetEmail } from "../services/email";
import { verifyTurnstileToken } from "../services/turnstile";
import { createWordProblemCaptcha, normalizeCaptchaAnswer } from "../utils/captcha";
import { authRequired, getSessionUser, isUniqueConstraintError, publicUser, type AppEnv } from "../utils/http";
import { hashPassword, sha256, verifyPassword } from "../utils/password";
import { rateLimit, rateLimitKeyByIp } from "../utils/rate-limit";

export const authRoutes = new Hono<AppEnv>();

const authCookieMaxAge = 60 * 60 * 24 * 7;
const googleOAuthStateMaxAge = 10 * 60;
const captchaTtlMs = 5 * 60 * 1000;
const captchaMaxFailedChecks = 5;
const passwordResetTtlMs = 30 * 60 * 1000;
const authCleanupIntervalMs = 5 * 60 * 1000;
const captchaChallenges = new Map<
  string,
  {
    answer: string;
    expiresAt: number;
    failedChecks: number;
    inputMode: "numeric" | "text";
    placeholder: string;
    hint?: string;
    difficulty: "ringan" | "sedang";
  }
>();
let nextCaptchaCleanupAt = 0;
let nextExpiredAuthCleanupAt = 0;
let lastCaptchaQuestion: string | null = null;

authRoutes.use(
  "/login",
  rateLimit({ keyPrefix: "auth:login", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
);
authRoutes.use(
  "/google",
  rateLimit({ keyPrefix: "auth:google", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
);
authRoutes.use(
  "/google/callback",
  rateLimit({ keyPrefix: "auth:google", windowMs: authRateLimitWindowMs, max: authRateLimitMax, key: rateLimitKeyByIp })
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
  if (now < nextCaptchaCleanupAt) return;
  for (const [token, challenge] of captchaChallenges) {
    if (challenge.expiresAt <= now) captchaChallenges.delete(token);
  }
  nextCaptchaCleanupAt = now + Math.min(captchaTtlMs, 60 * 1000);
}

function createCaptchaChallenge() {
  cleanupCaptchaChallenges();

  const selected = createWordProblemCaptcha(lastCaptchaQuestion);
  const token = nanoid(32);
  lastCaptchaQuestion = selected.question;

  captchaChallenges.set(token, {
    answer: selected.answer,
    expiresAt: Date.now() + captchaTtlMs,
    failedChecks: 0,
    inputMode: selected.inputMode,
    placeholder: selected.placeholder,
    hint: selected.hint,
    difficulty: selected.difficulty
  });
  return {
    token,
    question: selected.question,
    difficulty: selected.difficulty,
    inputMode: selected.inputMode,
    placeholder: selected.placeholder,
    hint: selected.hint
  };
}

function verifyCaptcha(token: string, answer: string) {
  cleanupCaptchaChallenges();

  const challenge = captchaChallenges.get(token);
  captchaChallenges.delete(token);

  if (!challenge) return false;
  if (challenge.expiresAt <= Date.now()) return false;
  const normalizedAnswer = challenge.inputMode === "numeric" ? answer.trim() : normalizeCaptchaAnswer(answer);
  return normalizedAnswer === challenge.answer;
}

function isCaptchaAnswerValid(token: string, answer: string) {
  cleanupCaptchaChallenges();

  const challenge = captchaChallenges.get(token);
  if (!challenge) return false;
  if (challenge.expiresAt <= Date.now()) return false;
  const normalizedAnswer = challenge.inputMode === "numeric" ? answer.trim() : normalizeCaptchaAnswer(answer);
  const valid = normalizedAnswer === challenge.answer;
  if (!valid) {
    challenge.failedChecks += 1;
    if (challenge.failedChecks >= captchaMaxFailedChecks) captchaChallenges.delete(token);
  }
  return valid;
}

function clientAddress(c: Context<AppEnv>) {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || undefined;
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

function redirectWithAuthError(c: Context<AppEnv>, message: string) {
  const url = new URL(appPublicUrl);
  url.searchParams.set("auth_error", message);
  return c.redirect(url.toString());
}

async function fetchGoogleProfile(code: string) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleOAuthClientId,
      client_secret: googleOAuthClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: googleOAuthRedirectUrl
    })
  });

  if (!tokenResponse.ok) throw new Error("Google OAuth token exchange failed.");
  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenBody.access_token) throw new Error("Google OAuth access token missing.");

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` }
  });

  if (!profileResponse.ok) throw new Error("Google OAuth profile request failed.");
  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.email || profile.email_verified !== true) throw new Error("Google OAuth email is not verified.");
  return {
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() || profile.email.split("@")[0] || "Pengguna Google"
  };
}

async function cleanupExpiredAuthRows() {
  const now = new Date();
  if (now.getTime() < nextExpiredAuthCleanupAt) return;
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
  await db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, now));
  nextExpiredAuthCleanupAt = now.getTime() + authCleanupIntervalMs;
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

authRoutes.get("/google", (c) => {
  if (!googleOAuthEnabled) return c.json({ message: "Login Google belum dikonfigurasi." }, 503);

  const state = nanoid(32);
  setCookie(c, "google_oauth_state", state, {
    httpOnly: true,
    sameSite: authCookieSameSite,
    secure: authCookieSecure || authCookieSameSite === "None",
    domain: authCookieDomain,
    path: "/api/auth/google/callback",
    maxAge: googleOAuthStateMaxAge
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleOAuthClientId);
  url.searchParams.set("redirect_uri", googleOAuthRedirectUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return c.redirect(url.toString());
});

authRoutes.get("/google/callback", async (c) => {
  if (!googleOAuthEnabled) return redirectWithAuthError(c, "Login Google belum dikonfigurasi.");

  const state = c.req.query("state") ?? "";
  const expectedState = getCookie(c, "google_oauth_state") ?? "";
  deleteCookie(c, "google_oauth_state", { path: "/api/auth/google/callback", domain: authCookieDomain });

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithAuthError(c, "Sesi login Google tidak valid. Coba lagi.");
  }

  const code = c.req.query("code");
  if (!code) return redirectWithAuthError(c, "Kode login Google tidak tersedia.");

  try {
    await cleanupExpiredAuthRows();
    const profile = await fetchGoogleProfile(code);
    let user = await db.query.users.findFirst({ where: eq(users.username, profile.email) });

    if (!user) {
      const id = nanoid();
      await db.insert(users).values({
        id,
        username: profile.email,
        name: profile.name,
        role: "user",
        passwordHash: await hashPassword(nanoid(64))
      });
      user = await db.query.users.findFirst({ where: eq(users.id, id) });
    }

    if (!user) return redirectWithAuthError(c, "Login Google gagal membuat akun.");

    await createSession(c, user.id);
    return c.redirect(appPublicUrl);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Login Google gagal.");
    return redirectWithAuthError(c, "Login Google gagal. Coba lagi.");
  }
});

authRoutes.get("/captcha", (c) => c.json(createCaptchaChallenge()));

authRoutes.post(
  "/captcha/verify",
  zValidator(
    "json",
    z.object({
      captchaToken: z.string().min(1, "Captcha tidak valid."),
      captchaAnswer: z.string().trim().min(1, "Jawaban captcha wajib diisi.")
    })
  ),
  (c) => {
    const body = c.req.valid("json");
    return c.json({ valid: isCaptchaAnswerValid(body.captchaToken, body.captchaAnswer) });
  }
);

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
      captchaToken: z.string().min(1, "Captcha tidak valid.").optional(),
      captchaAnswer: z.string().trim().min(1, "Jawaban captcha wajib diisi.").optional(),
      turnstileToken: z.string().trim().min(1, "Verifikasi Turnstile wajib diselesaikan.").optional()
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const id = nanoid();
    const username = body.email.toLowerCase();

    if (turnstileEnabled) {
      if (!body.turnstileToken) return c.json({ message: "Verifikasi Turnstile wajib diselesaikan." }, 400);
      const turnstileValid = await verifyTurnstileToken(body.turnstileToken, clientAddress(c));
      if (!turnstileValid) return c.json({ message: "Verifikasi Turnstile gagal. Coba lagi." }, 400);
    } else {
      if (!body.captchaToken || !body.captchaAnswer || !verifyCaptcha(body.captchaToken, body.captchaAnswer)) {
        return c.json({ message: "Jawaban captcha belum benar." }, 400);
      }
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

authRoutes.get("/session", async (c) => c.json({ user: await getSessionUser(c) }));

authRoutes.get("/me", authRequired, (c) => c.json({ user: c.get("user") }));
