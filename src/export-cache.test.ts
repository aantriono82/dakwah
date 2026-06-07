import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppEnv } from "./utils/http";

const cachedPdfBytes = new TextEncoder().encode("%PDF-1.4\ncached export hit\n");
const databaseUrl = join("/tmp", `dakwah-export-cache-${Date.now()}.sqlite`);

let streamFileCalls = 0;
let uploadFileCalls = 0;
let createPdfCalls = 0;

const storageMock = {
  async uploadFile() {
    uploadFileCalls += 1;
    return {
      key: "exports/mock/generated.pdf",
      url: "http://storage.local/generated.pdf"
    };
  },
  async getFileUrl(key: string) {
    return `http://storage.local/${key}`;
  },
  async streamFile() {
    streamFileCalls += 1;
    return {
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(cachedPdfBytes);
          controller.close();
        }
      }),
      contentLength: cachedPdfBytes.byteLength
    };
  },
  isStorageRequired() {
    return false;
  },
  async checkStorageHealth() {
    return {
      ok: true,
      required: false,
      bucket: "dakwah",
      endpoint: "http://storage.local",
      publicUrl: "http://storage.local/dakwah"
    };
  }
};

const exportersMock = {
  async createPdf() {
    createPdfCalls += 1;
    return new TextEncoder().encode("%PDF-1.4\nregenerated\n");
  },
  async createDocx() {
    return new TextEncoder().encode("PK");
  }
};

mock.module("./services/storage", () => storageMock);
mock.module("./services/exporters", () => exportersMock);

let app: Hono<AppEnv>;
let db: Awaited<typeof import("./db/client")>["db"];
let naskah: Awaited<typeof import("./db/schema")>["naskah"];
let userCookie = "";

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.AI_PROVIDER = "openai";
  process.env.MYQURAN_ENABLED = "false";
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  ({ app } = await import("./index"));
  ({ db } = await import("./db/client"));
  ({ naskah } = await import("./db/schema"));

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "user", password: "user123" })
  });
  userCookie = cookieFrom(login);
});

afterAll(() => {
  rmSync(databaseUrl, { force: true });
  rmSync(`${databaseUrl}-shm`, { force: true });
  rmSync(`${databaseUrl}-wal`, { force: true });
});

function cookieFrom(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function request(path: string, init: RequestInit = {}, cookie = "") {
  return app.fetch(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(init.headers ?? {})
      }
    })
  );
}

describe("export cache hit", () => {
  test("pdf export streams cached storage object without regenerating document", async () => {
    streamFileCalls = 0;
    uploadFileCalls = 0;
    createPdfCalls = 0;

    const create = await request(
      "/api/naskah",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Ceramah Cache Hit",
          jenis: "ceramah",
          bahasa: "Indonesia",
          duration: "pendek",
          parameters: { bahasa: "Indonesia", topik: "Amanah" },
          content: "Naskah ceramah yang cukup panjang untuk kebutuhan export cache hit."
        })
      },
      userCookie
    );
    const created = await create.json();
    const naskahId = created.data.id as string;

    await db
      .update(naskah)
      .set({
        pdfFileKey: "exports/user/cache-hit.pdf",
        pdfFileUrl: "http://storage.local/exports/user/cache-hit.pdf"
      })
      .where(eq(naskah.id, naskahId));

    const response = await request(`/api/export/${naskahId}/pdf`, { method: "POST" }, userCookie);
    const file = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-export-cache")).toBe("hit");
    expect(response.headers.get("x-storage-url")).toBe("http://storage.local/exports/user/cache-hit.pdf");
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-length")).toBe(String(cachedPdfBytes.byteLength));
    expect(file).toEqual(cachedPdfBytes);
    expect(streamFileCalls).toBe(1);
    expect(uploadFileCalls).toBe(0);
    expect(createPdfCalls).toBe(0);
  });
});
