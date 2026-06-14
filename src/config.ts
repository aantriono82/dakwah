import { parseOpenAIModels } from "./services/openai";

function optionalPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseSameSite(value: string | undefined) {
  const normalized = String(value ?? "Lax").trim().toLowerCase();
  if (normalized === "strict") return "Strict" as const;
  if (normalized === "none") return "None" as const;
  return "Lax" as const;
}

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export const providerTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);
export const openAiModels = parseOpenAIModels(process.env.OPENAI_MODELS, process.env.OPENAI_MODEL || "gpt-4o-mini");
export const geminiModels = parseOpenAIModels(process.env.GEMINI_MODELS, process.env.GEMINI_MODEL || "gemini-2.5-flash");
export const aiProvider = String(process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
export const activeModelCount = aiProvider === "gemini" ? geminiModels.length : openAiModels.length;
export const generateClientTimeoutMs = Math.max(120_000, providerTimeoutMs * Math.max(1, activeModelCount) + 30_000);
export const appPublicUrl = String(process.env.APP_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/+$/, "");
export const resendApiKey = process.env.RESEND_API_KEY;
export const emailFrom = process.env.EMAIL_FROM ?? "Dakwah <onboarding@resend.dev>";
export const corsOrigins = parseList(process.env.CORS_ORIGINS);
export const authCookieSecure = parseBoolean(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === "production");
export const authCookieSameSite = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);
export const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
export const authRateLimitWindowMs = optionalPositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
export const authRateLimitMax = optionalPositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 30);
export const googleOAuthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "";
export const googleOAuthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || "";
export const googleOAuthRedirectUrl =
  process.env.GOOGLE_OAUTH_REDIRECT_URL?.trim().replace(/\/+$/, "") || `${appPublicUrl}/api/auth/google/callback`;
export const googleOAuthEnabled = Boolean(googleOAuthClientId && googleOAuthClientSecret);
export const authCaptchaProvider = String(process.env.AUTH_CAPTCHA_PROVIDER ?? "manual").trim().toLowerCase();
export const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim() || "";
export const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || "";
export const turnstileEnabled = authCaptchaProvider === "turnstile" && Boolean(turnstileSiteKey && turnstileSecretKey);
export const generateRateLimitWindowMs = optionalPositiveInteger(process.env.GENERATE_RATE_LIMIT_WINDOW_MS, 60 * 1000);
export const generateRateLimitMax = optionalPositiveInteger(process.env.GENERATE_RATE_LIMIT_MAX, 6);
export const defaultDailyGenerateLimit = optionalPositiveInteger(process.env.DEFAULT_DAILY_GENERATE_LIMIT, 50);
export const myQuranEnabled = parseBoolean(process.env.MYQURAN_ENABLED, true);
export const myQuranApiBaseUrl = String(process.env.MYQURAN_API_BASE_URL ?? "https://api.myquran.com/v3").replace(/\/+$/, "");
export const myQuranTimeoutMs = optionalPositiveInteger(process.env.MYQURAN_TIMEOUT_MS, 2500);
export const myQuranCacheTtlSeconds = optionalPositiveInteger(process.env.MYQURAN_CACHE_TTL_SECONDS, 30 * 24 * 60 * 60);
export const exportPdfTimeoutMs = optionalPositiveInteger(process.env.EXPORT_PDF_TIMEOUT_MS, 20_000);
