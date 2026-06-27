import { existsSync } from "node:fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { migrate } from "./db/migrate";
import { authRoutes } from "./routes/auth";
import { generateRoutes } from "./routes/generate";
import { naskahRoutes } from "./routes/naskah";
import { templateRoutes } from "./routes/templates";
import { exportRoutes } from "./routes/export";
import { adminRoutes } from "./routes/admin";
import { dalilRoutes } from "./routes/dalil";
import { statsRoutes } from "./routes/stats";
import {
  activeModelCount,
  aiProvider,
  aiModel,
  aiModels,
  aiBaseURL,
  appPublicUrl,
  corsOrigins,
  generateClientTimeoutMs,
  googleOAuthEnabled,
  myQuranEnabled,
  providerTimeoutMs,
  turnstileEnabled,
  turnstileSiteKey
} from "./config";
import { fetchOpenRouterModelCatalog, resolvePublicAiModels } from "./services/aiConfig";
import { checkStorageHealth, isStorageRequired } from "./services/storage";
import type { AppEnv } from "./utils/http";

await migrate();

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (corsOrigins.length > 0) return corsOrigins.includes(normalizedOrigin) ? origin : "";
      if (process.env.NODE_ENV === "production") return normalizedOrigin === appPublicUrl ? origin : "";
      return origin;
    },
    credentials: true
  })
);

const api = new Hono<AppEnv>();
api.get("/health", (c) => c.json({ ok: true, storageRequired: isStorageRequired() }));
api.get("/health/storage", async (c) => {
  const status = await checkStorageHealth();
  return c.json(status, status.ok || !status.required ? 200 : 503);
});
api.get("/config", async (c) =>
  c.json({
    data: {
      generateClientTimeoutMs,
      providerTimeoutMs,
      modelCount: activeModelCount,
      aiProvider,
      aiModel,
      aiModels: await resolvePublicAiModels({ provider: aiProvider, model: aiModel, models: aiModels, baseURL: aiBaseURL }),
      aiBaseURL,
      myQuranEnabled,
      storageRequired: isStorageRequired(),
      googleOAuthEnabled,
      authCaptcha: turnstileEnabled
        ? { provider: "turnstile", turnstileSiteKey }
        : { provider: "manual" }
    }
  })
);
api.get("/ai/models", async (c) => {
  const models = await fetchOpenRouterModelCatalog({
    provider: aiProvider,
    model: aiModel,
    models: aiModels,
    baseURL: aiBaseURL,
    apiKey: process.env.OPENAI_API_KEY?.trim() || undefined
  });
  return c.json({
    data: {
      models:
        models.length > 0
          ? models
          : aiModels.map((id) => ({
              id,
              name: id,
              pricingLabel: "Tidak diketahui" as const,
              isFree: false
            }))
    }
  });
});
api.route("/auth", authRoutes);
api.route("/generate", generateRoutes);
api.route("/dalil", dalilRoutes);
api.route("/naskah", naskahRoutes);
api.route("/templates", templateRoutes);
api.route("/export", exportRoutes);
api.route("/admin", adminRoutes);
api.route("/stats", statsRoutes);

app.route("/api", api);

const shouldServeFrontend =
  process.env.SERVE_FRONTEND !== "false" && (process.env.NODE_ENV === "production" || existsSync("./dist/public/index.html"));

if (shouldServeFrontend) {
  app.use(
    "*",
    serveStatic({
      root: "./dist/public",
      onFound: (path, c) => {
        const normalizedPath = path.replace(/\\/g, "/");
        if (normalizedPath.includes("/assets/")) {
          c.header("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }
        c.header("Cache-Control", "no-cache, no-store, must-revalidate");
        c.header("Pragma", "no-cache");
        c.header("Expires", "0");
      }
    })
  );
  app.get(
    "*",
    serveStatic({
      path: "./dist/public/index.html",
      onFound: (_path, c) => {
        c.header("Cache-Control", "no-cache, no-store, must-revalidate");
        c.header("Pragma", "no-cache");
        c.header("Expires", "0");
      }
    })
  );
} else {
  app.get("/", (c) =>
    c.html(`
      <!doctype html>
      <html lang="id">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body>
          <p>Backend Dakwah aktif. Jalankan frontend dengan <code>bunx vite --host 0.0.0.0</code> atau build production.</p>
        </body>
      </html>
    `)
  );
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  const idleTimeoutSeconds = Math.min(255, Math.max(1, Math.ceil(generateClientTimeoutMs / 1000)));
  Bun.serve({ hostname: "0.0.0.0", port, fetch: app.fetch, idleTimeout: idleTimeoutSeconds });
  console.log(`Dakwah berjalan di http://localhost:${port}`);
}

export { app };
