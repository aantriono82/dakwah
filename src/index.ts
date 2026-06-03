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
import { statsRoutes } from "./routes/stats";
import { activeModelCount, aiProvider, generateClientTimeoutMs, providerTimeoutMs } from "./config";
import type { AppEnv } from "./utils/http";

await migrate();

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => origin,
    credentials: true
  })
);

const api = new Hono<AppEnv>();
api.get("/health", (c) => c.json({ ok: true }));
api.get("/config", (c) =>
  c.json({
    data: {
      generateClientTimeoutMs,
      providerTimeoutMs,
      modelCount: activeModelCount,
      aiProvider
    }
  })
);
api.route("/auth", authRoutes);
api.route("/generate", generateRoutes);
api.route("/naskah", naskahRoutes);
api.route("/templates", templateRoutes);
api.route("/export", exportRoutes);
api.route("/admin", adminRoutes);
api.route("/stats", statsRoutes);

app.route("/api", api);

const shouldServeFrontend = process.env.NODE_ENV === "production" || existsSync("./dist/public/index.html");

if (shouldServeFrontend) {
  app.use("*", serveStatic({ root: "./dist/public" }));
  app.get("*", serveStatic({ path: "./dist/public/index.html" }));
} else {
  app.get("/", (c) =>
    c.html(`
      <!doctype html>
      <html lang="id">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body>
          <p>Backend KhutbahAI aktif. Jalankan frontend dengan <code>bunx vite --host 0.0.0.0</code> atau build production.</p>
        </body>
      </html>
    `)
  );
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  Bun.serve({ hostname: "0.0.0.0", port, fetch: app.fetch, idleTimeout: Math.ceil(generateClientTimeoutMs / 1000) });
  console.log(`KhutbahAI berjalan di http://localhost:${port}`);
}

export { app };
