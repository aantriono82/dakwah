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
  process.env.S3_ENDPOINT = "http://127.0.0.1:65534";
  process.env.S3_PUBLIC_URL = "http://127.0.0.1:65534/khutbahai";
  process.env.RESET_PASSWORD_DEBUG_LINK = "true";
  process.env.AUTH_RATE_LIMIT_MAX = "100";
  process.env.GENERATE_RATE_LIMIT_MAX = "100";
  process.env.DEFAULT_DAILY_GENERATE_LIMIT = "100";
  process.env.MYQURAN_ENABLED = "false";
  delete process.env.S3_REQUIRED;
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

function solveCaptcha(question: string) {
  let match = question.match(/^(\d+) x (\d+) \+ (\d+)$/);
  if (match) return String(Number(match[1]) * Number(match[2]) + Number(match[3]));

  match = question.match(/^(\d+) \+ (\d+) x (\d+)$/);
  if (match) return String(Number(match[1]) + Number(match[2]) * Number(match[3]));

  match = question.match(/^\((\d+) \+ (\d+)\) x (\d+)$/);
  if (match) return String((Number(match[1]) + Number(match[2])) * Number(match[3]));

  match = question.match(/^(\d+) x \((\d+) \+ (\d+)\)$/);
  if (match) return String(Number(match[1]) * (Number(match[2]) + Number(match[3])));

  match = question.match(/^(\d+) \+ (\d+) \+ (\d+)$/);
  if (match) return String(Number(match[1]) + Number(match[2]) + Number(match[3]));

  throw new Error(`Unknown captcha question: ${question}`);
}

async function captchaPayload() {
  const response = await request("/api/auth/captcha");
  const body = (await response.json()) as { token: string; question: string };

  expect(response.status).toBe(200);
  return { captchaToken: body.token, captchaAnswer: solveCaptcha(body.question) };
}

describe("API auth and roles", () => {
  test("health and public config expose storage readiness mode", async () => {
    const health = await request("/api/health");
    const healthBody = await health.json();
    expect(health.status).toBe(200);
    expect(healthBody.storageRequired).toBe(false);

    const storage = await request("/api/health/storage");
    const storageBody = await storage.json();
    expect(storage.status).toBe(200);
    expect(storageBody.ok).toBe(false);
    expect(storageBody.required).toBe(false);

    const config = await request("/api/config");
    const configBody = await config.json();
    expect(config.status).toBe(200);
    expect(configBody.data.storageRequired).toBe(false);
  });

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

  test("register creates a user, starts a session, and allows login", async () => {
    const email = `jamaah-${Date.now()}@example.com`;
    const captcha = await captchaPayload();
    const register = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Jamaah Baru",
        password: "password123",
        ...captcha
      })
    });
    const registerCookie = cookieFrom(register);
    const registered = await register.json();

    expect(register.status).toBe(201);
    expect(registered.user).toMatchObject({ username: email, name: "Jamaah Baru", role: "user" });
    expect(registerCookie).toStartWith("khutbah_session=");

    const me = await request("/api/auth/me", {}, registerCookie);
    expect(me.status).toBe(200);
    expect((await me.json()).user.username).toBe(email);

    await request("/api/auth/logout", { method: "POST", body: "{}" }, registerCookie);
    const loginResult = await login(email, "password123");
    expect(loginResult.response.status).toBe(200);
    expect(loginResult.body.user.name).toBe("Jamaah Baru");

    const duplicateCaptcha = await captchaPayload();
    const duplicate = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Jamaah Baru",
        password: "password123",
        ...duplicateCaptcha
      })
    });
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).message).toBe("Email sudah digunakan.");
  });

  test("register rejects invalid captcha", async () => {
    const captcha = await captchaPayload();
    const response = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: `captcha-${Date.now()}@example.com`,
        name: "Captcha User",
        password: "password123",
        captchaToken: captcha.captchaToken,
        captchaAnswer: String(Number(captcha.captchaAnswer) + 1)
      })
    });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Jawaban captcha belum benar.");
  });

  test("forgot and reset password update credentials", async () => {
    const email = `reset-${Date.now()}@example.com`;
    const captcha = await captchaPayload();
    const register = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        name: "Reset User",
        password: "old-password",
        ...captcha
      })
    });
    const registerCookie = cookieFrom(register);
    expect(register.status).toBe(201);
    await request("/api/auth/logout", { method: "POST", body: "{}" }, registerCookie);

    const forgot = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    const forgotBody = (await forgot.json()) as { message: string; resetUrl?: string };
    expect(forgot.status).toBe(200);
    expect(forgotBody.message).toBe("Jika email terdaftar, instruksi reset kata sandi akan dikirim.");
    expect(typeof forgotBody.resetUrl).toBe("string");

    const token = new URL(forgotBody.resetUrl ?? "").searchParams.get("token");
    expect(typeof token).toBe("string");

    const invalid = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "invalid-reset-token", password: "new-password" })
    });
    expect(invalid.status).toBe(400);

    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: "new-password" })
    });
    expect(reset.status).toBe(200);

    const oldLogin = await login(email, "old-password");
    expect(oldLogin.response.status).toBe(401);

    const newLogin = await login(email, "new-password");
    expect(newLogin.response.status).toBe(200);
    expect(newLogin.body.user.username).toBe(email);
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

  test("admin can curate dalil with manual tags for retrieval", async () => {
    const quranCreate = await request(
      "/api/admin/dalil",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "quran",
          reference: "QS. Al-Baqarah: 153",
          arab: "يَا أَيُّهَا الَّذِيْنَ آمَنُوا اسْتَعِيْنُوا بِالصَّبْرِ وَالصَّلَاةِ.",
          translation: "Wahai orang-orang yang beriman, mohonlah pertolongan dengan sabar dan shalat.",
          source: "Kurasi admin",
          tags: ["ujian-khusus", "sabar"],
          status: "approved",
          isActive: true
        })
      },
      adminCookie
    );
    const quran = await quranCreate.json();
    expect(quranCreate.status).toBe(201);

    const hadithCreate = await request(
      "/api/admin/dalil",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "hadith",
          reference: "HR. Muslim",
          arab: "عَجَبًا لِأَمْرِ الْمُؤْمِنِ.",
          translation: "Sungguh menakjubkan keadaan seorang mukmin.",
          source: "Kurasi admin",
          grade: "Sahih",
          takhrij: "HR. Muslim",
          tags: ["ujian-khusus", "sabar"],
          status: "approved",
          isActive: true
        })
      },
      adminCookie
    );
    const hadith = await hadithCreate.json();
    expect(hadithCreate.status).toBe(201);

    const list = await request("/api/admin/dalil?q=ujian-khusus&status=all", {}, adminCookie);
    expect(list.status).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(2);

    const retrieval = await request(
      "/api/dalil/search",
      {
        method: "POST",
        body: JSON.stringify({ jenis: "ceramah", parameters: { bahasa: "Indonesia", topik: "ujian-khusus" } })
      },
      adminCookie
    );
    const retrieved = await retrieval.json();
    expect(retrieval.status).toBe(200);
    expect(retrieved.data.source).toBe("Kurasi admin");
    expect(retrieved.data.quran[0].reference).toBe("QS. Al-Baqarah: 153");
    expect(retrieved.data.hadith[0].grade).toBe("Sahih");

    const update = await request(
      `/api/admin/dalil/${quran.data.id}`,
      { method: "PUT", body: JSON.stringify({ isActive: false, status: "archived", tags: ["arsip"] }) },
      adminCookie
    );
    expect(update.status).toBe(200);
    expect((await update.json()).data.isActive).toBe(false);

    expect((await request(`/api/admin/dalil/${quran.data.id}`, { method: "DELETE" }, adminCookie)).status).toBe(200);
    expect((await request(`/api/admin/dalil/${hadith.data.id}`, { method: "DELETE" }, adminCookie)).status).toBe(200);
  });
});

describe("API naskah, template, generate, and export", () => {
  test("anonymous users cannot use generate, naskah, template, or export features", async () => {
    const generateBody = {
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" }
    };
    const saveBody = {
      title: "Ceramah Amanah",
      jenis: "ceramah",
      bahasa: "Indonesia",
      duration: "sedang",
      parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" },
      content: "Naskah ceramah tentang menjaga amanah dengan isi yang cukup panjang."
    };
    const templateBody = {
      name: "Ceramah amanah",
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" }
    };

    const responses = await Promise.all([
      request("/api/generate", { method: "POST", body: JSON.stringify(generateBody) }),
      request("/api/generate/stream", { method: "POST", body: JSON.stringify(generateBody) }),
      request("/api/naskah"),
      request("/api/naskah", { method: "POST", body: JSON.stringify(saveBody) }),
      request("/api/templates"),
      request("/api/templates", { method: "POST", body: JSON.stringify(templateBody) }),
      request("/api/export/anonymous-id/pdf", { method: "POST" })
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect((await response.json()).message).toBe("Belum login.");
    }
  });

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
    expect(body.quality.score).toBeGreaterThan(0);
  });

  test("generate refine returns revised draft content with quality payload", async () => {
    const originalContent =
      "Ceramah Umum\n\nTema: Menjaga amanah\n\nPembukaan\nJamaah yang dirahmati Allah, amanah adalah titipan yang harus dijaga dalam keluarga, pekerjaan, dan masyarakat.\n\nAllah SWT berfirman dalam AlQuran\nQS. An-Nisa: 58\n\nRasulullah SAW bersabda\nHR. Bukhari dan Muslim\n\nIsi Utama\nAmanah harus dijaga dalam perkataan dan perbuatan agar kehidupan tetap lurus dan membawa keberkahan.";

    const response = await request(
      "/api/generate/refine",
      {
        method: "POST",
        body: JSON.stringify({
          jenis: "ceramah",
          parameters: { bahasa: "Indonesia", topik: "Menjaga amanah", durasi: "pendek" },
          content: originalContent,
          instruction: "Perhalus bahasa agar lebih natural dan kuat untuk jamaah."
        })
      },
      userCookie
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toContain("Ceramah Umum");
    expect(body.content).toContain("Menjaga amanah");
    expect(body.quality.score).toBeGreaterThan(0);
    expect(body.quality.wordCount).toBeGreaterThan(0);
    expect(Array.isArray(body.quality.checks)).toBe(true);
  });

  test("dalil search returns themed quran and hadith context", async () => {
    const response = await request(
      "/api/dalil/search",
      {
        method: "POST",
        body: JSON.stringify({ jenis: "ceramah", parameters: { bahasa: "Indonesia", topik: "Sabar menghadapi musibah" } })
      },
      userCookie
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.theme).toBe("Sabar menghadapi musibah");
    expect(body.data.quran[0].reference).toBe("QS. Al-Baqarah: 153");
    expect(body.data.hadith[0].reference).toContain("HR.");
    expect(body.data.warnings[0]).toContain("MYQURAN_ENABLED=false");
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
    expect(created.data.status).toBe("draft");
    expect(created.data.version).toBe(1);
    expect(created.data.qualityReport.score).toBeGreaterThan(0);

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
    expect(updatedBody.data.version).toBe(2);
    expect(updatedBody.data.user).toMatchObject({ username: "user", role: "user" });
    expect(updatedBody.data.user).not.toHaveProperty("passwordHash");

    const autosave = await request(
      `/api/naskah/${createdNaskahId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          content: "Autosave naskah ceramah tentang amanah yang tetap cukup panjang untuk disimpan sebagai draft.",
          autosave: true
        })
      },
      userCookie
    );
    const autosavedBody = await autosave.json();
    expect(autosave.status).toBe(200);
    expect(autosavedBody.data.version).toBe(2);
    expect(typeof autosavedBody.data.autosavedAt).toBe("string");

    const versions = await request(`/api/naskah/${createdNaskahId}/versions`, {}, userCookie);
    const versionsBody = await versions.json();
    expect(versions.status).toBe(200);
    expect(versionsBody.data.length).toBeGreaterThanOrEqual(2);

    const refine = await request(
      `/api/naskah/${createdNaskahId}/refine`,
      { method: "POST", body: JSON.stringify({ instruction: "Tambahkan penekanan agar jamaah menjaga amanah di keluarga." }) },
      userCookie
    );
    const refinedBody = await refine.json();
    expect(refine.status).toBe(200);
    expect(refinedBody.data.version).toBe(3);

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

  test("refine stores custom quick-fix change summary in versions", async () => {
    const create = await request(
      "/api/naskah",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Ceramah Fokus Tema",
          jenis: "ceramah",
          bahasa: "Indonesia",
          duration: "sedang",
          parameters: { bahasa: "Indonesia", topik: "Bahaya judi online pada keluarga muda" },
          content: "Naskah ceramah tentang bahaya judi online pada keluarga muda dengan isi yang cukup panjang untuk diproses revisi."
        })
      },
      userCookie
    );
    const created = await create.json();
    const naskahId = created.data.id as string;

    const refine = await request(
      `/api/naskah/${naskahId}/refine`,
      {
        method: "POST",
        body: JSON.stringify({
          instruction: "Perkuat fokus tema agar isi tidak terlalu umum.",
          changeSummary: "Quick fix: fokus tema"
        })
      },
      userCookie
    );
    expect(refine.status).toBe(200);

    const versions = await request(`/api/naskah/${naskahId}/versions`, {}, userCookie);
    const versionsBody = await versions.json();
    expect(versions.status).toBe(200);
    expect(versionsBody.data[0].changeSummary).toBe("Quick fix: fokus tema");

    const cleanup = await request(`/api/naskah/${naskahId}`, { method: "DELETE" }, userCookie);
    expect(cleanup.status).toBe(200);
  });

  test("export returns a document response", async () => {
    const response = await request(`/api/export/${createdNaskahId}/pdf`, { method: "POST" }, userCookie);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.has("x-storage-url")).toBe(true);
    expect(response.headers.has("x-storage-error")).toBe(true);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });

  test("naskah can be deleted", async () => {
    const remove = await request(`/api/naskah/${createdNaskahId}`, { method: "DELETE" }, userCookie);
    expect(remove.status).toBe(200);

    const getDeleted = await request(`/api/naskah/${createdNaskahId}`, {}, userCookie);
    expect(getDeleted.status).toBe(404);
  });
});
