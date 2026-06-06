import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const appUrl = process.env.UI_SMOKE_URL ?? "http://localhost:3000";
const username = process.env.UI_SMOKE_USERNAME ?? "admin";
const password = process.env.UI_SMOKE_PASSWORD ?? "admin123";
const screenshotDir = process.env.UI_SMOKE_SCREENSHOT_DIR ?? "/tmp/khutbahai-ui-smoke";
const chromePath = process.env.UI_SMOKE_CHROME_PATH ?? "google-chrome";

type CdpResponse = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson<T>(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return (await response.json()) as T;
    } catch {
      // Browser is still starting.
    }
    await sleep(100);
  }
  throw new Error(`Tidak bisa terhubung ke ${url}`);
}

async function createCdpClient(webSocketDebuggerUrl: string) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map<number, (value: CdpResponse) => void>();

  ws.onmessage = (event) => {
    const data = JSON.parse(String(event.data)) as CdpResponse;
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)?.(data);
      pending.delete(data.id);
    }
  };

  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });

  return {
    ws,
    send(method: string, params: Record<string, unknown> = {}) {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise<CdpResponse>((resolve) => pending.set(id, resolve));
    }
  };
}

async function loginCookie() {
  const response = await fetch(`${appUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) throw new Error(`Login smoke test gagal: ${response.status}`);

  const setCookie = response.headers.get("set-cookie") ?? "";
  const session = setCookie.match(/khutbah_session=([^;]+)/)?.[1];
  if (!session) throw new Error("Cookie session tidak ditemukan setelah login.");
  return session;
}

async function apiRequest<T>(session: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: `khutbah_session=${session}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API smoke gagal ${path}: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const session = await loginCookie();
  mkdirSync(screenshotDir, { recursive: true });

  const createdNaskah = await apiRequest<{ data: { id: string } }>(session, "/api/naskah", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke Quick Fix Fokus Tema",
      jenis: "ceramah",
      bahasa: "Indonesia",
      duration: "sedang",
      parameters: { bahasa: "Indonesia", topik: "Bahaya judi online pada keluarga muda" },
      content:
        "Ceramah Umum\n\nPembukaan\nHadirin yang dirahmati Allah, tema ini mengingatkan kita untuk selalu memperbaiki diri.\n\nAllah SWT berfirman dalam AlQuran\nQS. Al-Baqarah: 153\n\nRasulullah SAW bersabda\nHR. Muslim\n\nIsi Utama\nPada kesempatan kali ini marilah kita sama-sama meningkatkan iman, akhlak, dan kepedulian sosial dalam kehidupan sehari-hari."
    })
  });
  const generateDraftContent =
    "Ceramah Umum\n\nPembukaan\nHadirin yang dirahmati Allah, tema ini mengingatkan kita untuk selalu memperbaiki diri.\n\nAllah SWT berfirman dalam AlQuran\nQS. Al-Baqarah: 153\n\nRasulullah SAW bersabda\nHR. Muslim\n\nIsi Utama\nPada kesempatan kali ini marilah kita sama-sama meningkatkan iman, akhlak, dan kepedulian sosial dalam kehidupan sehari-hari.";
  const generateDraftQuality = await apiRequest<{ quality: unknown }>(session, "/api/generate/review", {
    method: "POST",
    body: JSON.stringify({
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", topik: "Bahaya judi online pada keluarga muda", durasi: "sedang" },
      content: generateDraftContent
    })
  });

  const port = 13_000 + Math.floor(Math.random() * 1000);
  const profile = `/tmp/khutbahai-ui-smoke-${port}`;
  Bun.spawn(
    [
      chromePath,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank"
    ],
    { stdout: "pipe", stderr: "pipe" }
  );

  const version = await waitForJson<{ webSocketDebuggerUrl: string }>(`http://127.0.0.1:${port}/json/version`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${appUrl}/`, { method: "PUT" }).then(
    (response) => response.json() as Promise<{ webSocketDebuggerUrl: string }>
  );
  const browser = await createCdpClient(version.webSocketDebuggerUrl);
  const page = await createCdpClient(target.webSocketDebuggerUrl);

  async function evaluate(expression: string) {
    return page.send("Runtime.evaluate", { expression, returnByValue: true });
  }

  async function waitForText(text: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
      if ((response.result?.result as { value?: boolean } | undefined)?.value) return;
      await sleep(150);
    }
    throw new Error(`Teks tidak muncul di halaman: ${text}`);
  }

  async function waitForTextToDisappear(text: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
      if (!((response.result?.result as { value?: boolean } | undefined)?.value)) return;
      await sleep(150);
    }
    throw new Error(`Teks masih muncul di halaman: ${text}`);
  }

  async function maybeWaitForText(text: string, attempts = 10) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
      if ((response.result?.result as { value?: boolean } | undefined)?.value) return true;
      await sleep(120);
    }
    return false;
  }

  async function screenshot(name: string, width = 1366, height = 768) {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
    await sleep(500);
    const response = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const data = (response.result as { data?: string } | undefined)?.data;
    if (!data) throw new Error(`Screenshot gagal: ${name}`);
    writeFileSync(`${screenshotDir}/${name}.png`, Buffer.from(data, "base64"));
  }

  async function clickButton(text: string) {
    await evaluate(
      `Array.from(document.querySelectorAll("button")).find((button) => button.textContent.trim().includes(${JSON.stringify(text)}))?.click()`
    );
    await sleep(700);
  }

  async function clickButtonByAriaPrefix(prefix: string) {
    await evaluate(
      `Array.from(document.querySelectorAll("button")).find((button) => button.getAttribute("aria-label")?.startsWith(${JSON.stringify(prefix)}))?.click()`
    );
    await sleep(700);
  }

  async function clickByText(selector: string, text: string) {
    await evaluate(
      `Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find((node) => node.textContent?.includes(${JSON.stringify(text)}))?.click()`
    );
    await sleep(700);
  }

  async function scrollIntoText(text: string) {
    await evaluate(
      `Array.from(document.querySelectorAll("*")).find((node) => node.textContent?.includes(${JSON.stringify(text)}))?.scrollIntoView({ behavior: "instant", block: "center" })`
    );
    await sleep(700);
  }

  try {
    await page.send("Network.enable");
    await page.send("Page.enable");
    await page.send("Network.setCookie", {
      name: "khutbah_session",
      value: session,
      domain: new URL(appUrl).hostname,
      path: "/",
      sameSite: "Lax"
    });
    await page.send("Page.navigate", { url: appUrl });
    await waitForText("Mulai dari kebutuhan dakwah");
    await screenshot("dashboard");

    const tabChecks: Record<string, string> = {
      Ceramah: "Jenis naskah",
      Riwayat: "Naskah tersimpan",
      Template: "Parameter favorit"
    };

    for (const [tab, expectedText] of Object.entries(tabChecks)) {
      await clickButton(tab);
      await waitForText(expectedText);
      await screenshot(tab.toLowerCase());
    }

    await clickButtonByAriaPrefix("Akun ");
    await clickButton("Buka Admin");
    await waitForText("Monitoring dan user");
    await screenshot("admin");

    await clickButton("Ceramah");
    await waitForText("Jenis naskah");
    await screenshot("generate-mobile", 390, 844);

    await page.send("Page.navigate", { url: `${appUrl}/history` });
    await waitForText("Naskah tersimpan");
    await clickByText("button", "Smoke Quick Fix Fokus Tema");
    await waitForText("Perbaiki fokus tema");
    await screenshot("history-quick-fix-before");
    await clickButton("Perbaiki fokus tema");
    await maybeWaitForText("Naskah berhasil diperbaiki dan disimpan sebagai versi baru.", 30);
    await screenshot("history-quick-fix-after");

    await page.send("Page.navigate", { url: appUrl });
    await waitForText("Mulai dari kebutuhan dakwah");
    await clickButton("Ceramah");
    await waitForText("Jenis naskah");
    await evaluate(
      `window.__DAKWAH_UI_SMOKE__?.setGenerateDraft?.(${JSON.stringify({
        jenis: "ceramah",
        parameters: { bahasa: "Indonesia", topik: "Bahaya judi online pada keluarga muda", durasi: "sedang" },
        title: "Ceramah Umum: Bahaya judi online pada keluarga muda",
        content: generateDraftContent,
        quality: generateDraftQuality.quality
      })})`
    );
    await waitForText("Perbaiki fokus tema");
    await screenshot("generate-quick-fix-before");
    await clickButton("Perbaiki fokus tema");
    await maybeWaitForText("Perbaiki fokus tema...");
    await maybeWaitForText("Naskah berhasil diperbaiki.", 30);
    await waitForText("Quality guard");
    await waitForText("Editorial");
    await maybeWaitForText("Perbaiki fokus tema", 30);
    await screenshot("generate-quick-fix-after");
    await scrollIntoText("Revisi manual sebelum simpan");
    await screenshot("generate-editor-desktop");
    await scrollIntoText("Revisi manual sebelum simpan");
    await screenshot("generate-editor-mobile", 390, 844);

    console.log(`UI smoke test selesai. Screenshot: ${screenshotDir}`);
  } finally {
    await fetch(`${appUrl}/api/naskah/${createdNaskah.data.id}`, {
      method: "DELETE",
      headers: { Cookie: `khutbah_session=${session}` }
    }).catch(() => null);
    page.ws.close();
    await browser.send("Browser.close").catch(() => null);
    browser.ws.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

await main();
