import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { naskah } from "../db/schema";
import { createDocx, createPdf } from "../services/exporters";
import { uploadFile } from "../services/storage";
import { recordUsageEvent } from "../services/usage";
import { authRequired, canAccessOwner, type AppEnv } from "../utils/http";

export const exportRoutes = new Hono<AppEnv>();
exportRoutes.use("*", authRequired);

function exportFilename(title: string, id: string, format: "pdf" | "docx") {
  const slug = title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${slug || `naskah-${id}`}.${format}`;
}

exportRoutes.post("/:id/:format", async (c) => {
  const user = c.get("user");
  const startedAt = Date.now();
  const format = c.req.param("format");
  if (format !== "pdf" && format !== "docx") return c.json({ message: "Format harus pdf atau docx." }, 400);

  const row = await db.query.naskah.findFirst({ where: eq(naskah.id, c.req.param("id")) });
  if (!row) return c.json({ message: "Naskah tidak ditemukan." }, 404);
  if (!canAccessOwner(c, row.userId)) return c.json({ message: "Tidak berhak export naskah ini." }, 403);

  let bytes: Uint8Array;
  try {
    bytes = format === "pdf" ? await createPdf(row.title, row.content) : await createDocx(row.title, row.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export gagal.";
    return c.json({ message }, 500);
  }
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const key = `exports/${row.userId}/${row.id}.${format}`;
  let uploaded: Awaited<ReturnType<typeof uploadFile>>;
  try {
    uploaded = await uploadFile(key, bytes, contentType);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload storage gagal.";
    return c.json({ message }, 502);
  }

  await db.update(naskah).set({ fileKey: uploaded.key, fileUrl: uploaded.url }).where(eq(naskah.id, row.id));
  await recordUsageEvent({
    userId: user.id,
    eventType: "export",
    status: "ok",
    jenis: row.jenis,
    route: `/api/export/:id/${format}`,
    durationMs: Date.now() - startedAt,
    metadata: { format, storageUrl: uploaded.url, storageError: "error" in uploaded ? uploaded.error : undefined }
  });

  c.header("Content-Type", contentType);
  c.header("Content-Disposition", `attachment; filename="${exportFilename(row.title, row.id, format)}"`);
  c.header("X-Storage-Url", uploaded.url);
  if ("error" in uploaded && uploaded.error) c.header("X-Storage-Error", uploaded.error);
  return c.body(Buffer.from(bytes));
});
