import type { Context, Next } from "hono";
import type { AppEnv } from "./http";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (c: Context<AppEnv>) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientAddress(c: Context<AppEnv>) {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || "local";
}

function defaultKey(c: Context<AppEnv>) {
  return c.get("user")?.id ?? clientAddress(c);
}

function cleanup(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(options: RateLimitOptions) {
  return async (c: Context<AppEnv>, next: Next) => {
    if (options.max <= 0 || options.windowMs <= 0) {
      await next();
      return;
    }

    const now = Date.now();
    cleanup(now);

    const key = `${options.keyPrefix}:${options.key?.(c) ?? defaultKey(c)}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json(
        {
          message: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSeconds} detik.`,
          retryAfterSeconds
        },
        429
      );
    }

    bucket.count += 1;
    await next();
  };
}

export function rateLimitKeyByIp(c: Context<AppEnv>) {
  return clientAddress(c);
}
