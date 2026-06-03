import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import type { AppEnv } from "./utils/http";

const databaseUrl = join("/tmp", `khutbah-ai-test-${Date.now()}.sqlite`);
let app: Hono<AppEnv>;
let adminCookie = "";
let userCookie = "";
let createdNaskahId = "";

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.AI_PROVIDER = "openai";
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const module = await import("./index");
  app = module.app;
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

async function login(username: string, password: string) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  return { response, cookie: cookieFrom(response), body: await response.json() };
}

describe("API auth and roles", () => {
  test("login, me, and logout", async () => {
    const loginResult = await login("admin", "admin123");
    adminCookie = loginResult.cookie;

    expect(loginResult.response.status).toBe(200);
    expect(loginResult.body.user.role).toBe("admin");
    expect(adminCookie).toStartWith("khutbah_session=");

    const me = await request("/api/auth/me", {}, adminCookie);
    expect(me.status).toBe(200);
    expect((await me.json()).user.username).toBe("admin");

    const logout = await request("/api/auth/logout", { method: "POST", body: "{}" }, adminCookie);
    expect(logout.status).toBe(200);

    const afterLogout = await request("/api/auth/me", {}, adminCookie);
    expect(afterLogout.status).toBe(401);

    const loginAgain = await login("admin", "admin123");
    adminCookie = loginAgain.cookie;
  });

  test("admin endpoints reject user role and allow admin role", async () => {
    const userLogin = await login("user", "user123");
    userCookie = userLogin.cookie;

    const forbidden = await request("/api/admin/users", {}, userCookie);
    expect(forbidden.status).toBe(403);

    const allowed = await request("/api/admin/users", {}, adminCookie);
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).data.some((item: { role: string }) => item.role === "admin")).toBe(true);
  });

  test("admin can create, update, and delete users", async () => {
    const username = `editor-${Date.now()}`;
    const create = await request(
      "/api/admin/users",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          name: "Editor User",
          password: "password123",
          role: "user"
        })
      },
      adminCookie
    );
    const created = await create.json();

    expect(create.status).toBe(201);
    expect(created.data).toMatchObject({ username, name: "Editor User", role: "user" });

    const update = await request(
      `/api/admin/users/${created.data.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Editor Updated",
          password: "password456",
          role: "admin"
        })
      },
      adminCookie
    );
    const updated = await update.json();

    expect(update.status).toBe(200);
    expect(updated.data).toMatchObject({ username, name: "Editor Updated", role: "admin" });

    const updatedLogin = await login(username, "password456");
    expect(updatedLogin.response.status).toBe(200);
    expect(updatedLogin.body.user.role).toBe("admin");

    const remove = await request(`/api/admin/users/${created.data.id}`, { method: "DELETE" }, adminCookie);
    expect(remove.status).toBe(200);
  });

  test("admin user mutations report duplicate usernames clearly", async () => {
    const username = `duplicate-${Date.now()}`;
    const create = await request(
      "/api/admin/users",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          name: "Duplicate User",
          password: "password123",
          role: "user"
        })
      },
      adminCookie
    );
    const created = await create.json();

    expect(create.status).toBe(201);

    const duplicateCreate = await request(
      "/api/admin/users",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          name: "Duplicate User Two",
          password: "password123",
          role: "user"
        })
      },
      adminCookie
    );
    expect(duplicateCreate.status).toBe(409);
    expect((await duplicateCreate.json()).message).toBe("Username sudah digunakan.");

    const duplicateUpdate = await request(
      `/api/admin/users/${created.data.id}`,
      { method: "PUT", body: JSON.stringify({ username: "admin" }) },
      adminCookie
    );
    expect(duplicateUpdate.status).toBe(409);
    expect((await duplicateUpdate.json()).message).toBe("Username sudah digunakan.");

    const remove = await request(`/api/admin/users/${created.data.id}`, { method: "DELETE" }, adminCookie);
    expect(remove.status).toBe(200);
  });
});

describe("API naskah, template, generate, and export", () => {
  test("generate uses fallback without OpenAI key and validates required fields", async () => {
    const invalid = await request(
      "/api/generate",
      { method: "POST", body: JSON.stringify({ jenis: "ceramah", parameters: { bahasa: "Indonesia" } }) },
      userCookie
    );
    expect(invalid.status).toBe(400);

    const response = await request(
      "/api/generate",
      {
        method: "POST",
        body: JSON.stringify({ jenis: "ceramah", parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" } })
      },
      userCookie
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toContain("Menjaga amanah");
    expect(body.content).toContain("Ceramah Umum");
  });

  test("stream generate returns theme-aligned text and dalil for every content type", async () => {
    const cases = [
      {
        jenis: "khutbah-jumat",
        parameters: { bahasa: "Indonesia", temaUtama: "Menjaga amanah publik", durasi: "pendek" },
        label: "Khutbah Jumat",
        theme: "Menjaga amanah publik",
        ayat: ["QS. An-Nisa: 58", "QS. Al-Anfal: 27"],
        hadith: "apabila diberi amanah ia berkhianat",
        extra: "Khutbah Kedua"
      },
      {
        jenis: "idul-fitri",
        parameters: { bahasa: "Indonesia", tema: "Syukur setelah Ramadhan", durasi: "pendek" },
        label: "Khutbah Idul Fitri",
        theme: "Syukur setelah Ramadhan",
        ayat: ["QS. Ibrahim: 7"],
        hadith: "tidak bersyukur kepada Allah",
        extra: "Khutbah Kedua"
      },
      {
        jenis: "idul-adha",
        parameters: { bahasa: "Indonesia", tema: "Ikhlas berkurban", durasi: "pendek" },
        label: "Khutbah Idul Adha",
        theme: "Ikhlas berkurban",
        ayat: ["QS. Al-Hajj: 37"],
        hadith: "amal-amal itu bergantung pada niat",
        extra: "اَللهُ أَكْبَرُ"
      },
      {
        jenis: "nikah",
        parameters: {
          bahasa: "Indonesia",
          mempelaiPria: "Ahmad",
          mempelaiWanita: "Fatimah",
          temaPesan: "Komunikasi dalam rumah tangga",
          durasi: "pendek"
        },
        label: "Khutbah Nikah",
        theme: "Komunikasi dalam rumah tangga",
        ayat: ["QS. Qaf: 18"],
        hadith: "berkata baik atau diam",
        extra: "Ahmad dan Fatimah"
      },
      {
        jenis: "ceramah",
        parameters: { bahasa: "Indonesia", topik: "Sabar menghadapi musibah", durasi: "pendek" },
        label: "Ceramah Umum",
        theme: "Sabar menghadapi musibah",
        ayat: ["QS. Al-Baqarah: 153"],
        hadith: "Sungguh menakjubkan keadaan seorang mukmin",
        extra: "Poin-Poin Kunci"
      },
      {
        jenis: "kultum",
        parameters: { bahasa: "Indonesia", topikSingkat: "Sedekah kepada tetangga", durasi: "pendek" },
        label: "Kultum",
        theme: "Sedekah kepada tetangga",
        ayat: ["QS. Al-Baqarah: 261"],
        hadith: "Sedekah tidak akan mengurangi harta",
        extra: "kepedulian"
      }
    ];

    for (const item of cases) {
      const response = await request(
        "/api/generate/stream",
        {
          method: "POST",
          body: JSON.stringify({ jenis: item.jenis, parameters: item.parameters })
        },
        userCookie
      );
      const content = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(content).toContain(item.label);
      expect(content).toContain(`Tema: ${item.theme}`);
      expect(item.ayat.some((ayat) => content.includes(ayat))).toBe(true);
      expect(content).toContain(item.hadith);
      expect(content).toContain(item.extra);
      expect(content).toContain("HR.");
      expect(content).not.toContain("QS. Referensi umum");
      expect(content).not.toContain("HR. Referensi umum");
    }
  });

  test("template can be created, listed, and deleted", async () => {
    const create = await request(
      "/api/templates",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Ceramah amanah",
          jenis: "ceramah",
          parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" }
        })
      },
      userCookie
    );
    const created = await create.json();

    expect(create.status).toBe(201);
    expect(created.data.name).toBe("Ceramah amanah");

    const list = await request("/api/templates", {}, userCookie);
    expect((await list.json()).data).toHaveLength(1);

    const remove = await request(`/api/templates/${created.data.id}`, { method: "DELETE" }, userCookie);
    expect(remove.status).toBe(200);
  });

  test("naskah CRUD works for owner", async () => {
    const create = await request(
      "/api/naskah",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Ceramah Amanah",
          jenis: "ceramah",
          bahasa: "Indonesia",
          duration: "sedang",
          parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" },
          content: "Naskah ceramah tentang menjaga amanah dengan isi yang cukup panjang."
        })
      },
      userCookie
    );
    const created = await create.json();
    createdNaskahId = created.data.id;

    expect(create.status).toBe(201);
    expect(created.data.title).toBe("Ceramah Amanah");

    const list = await request("/api/naskah", {}, userCookie);
    const listBody = await list.json();
    expect(listBody.data.some((item: { id: string }) => item.id === createdNaskahId)).toBe(true);
    expect(listBody.data[0].user).not.toHaveProperty("passwordHash");

    const update = await request(
      `/api/naskah/${createdNaskahId}`,
      { method: "PUT", body: JSON.stringify({ title: "Ceramah Amanah Updated" }) },
      userCookie
    );
    expect(update.status).toBe(200);
    const updatedBody = await update.json();
    expect(updatedBody.data.title).toBe("Ceramah Amanah Updated");
    expect(updatedBody.data.user).toMatchObject({ username: "user", role: "user" });
    expect(updatedBody.data.user).not.toHaveProperty("passwordHash");

    const invalidTypeUpdate = await request(
      `/api/naskah/${createdNaskahId}`,
      { method: "PUT", body: JSON.stringify({ jenis: "kultum" }) },
      userCookie
    );
    expect(invalidTypeUpdate.status).toBe(400);
    expect((await invalidTypeUpdate.json()).message).toBe("Topik singkat wajib diisi.");

    const adminDetail = await request(`/api/naskah/${createdNaskahId}`, {}, adminCookie);
    const adminDetailBody = await adminDetail.json();
    expect(adminDetail.status).toBe(200);
    expect(adminDetailBody.data.user).toMatchObject({ username: "user", role: "user" });
    expect(adminDetailBody.data.user).not.toHaveProperty("passwordHash");
  });

  test("export returns a document response", async () => {
    const response = await request(`/api/export/${createdNaskahId}/pdf`, { method: "POST" }, userCookie);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.has("x-storage-url")).toBe(true);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });

  test("naskah can be deleted", async () => {
    const remove = await request(`/api/naskah/${createdNaskahId}`, { method: "DELETE" }, userCookie);
    expect(remove.status).toBe(200);

    const getDeleted = await request(`/api/naskah/${createdNaskahId}`, {}, userCookie);
    expect(getDeleted.status).toBe(404);
  });
});
