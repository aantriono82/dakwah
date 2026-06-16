import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { useGenerateStorageActions } from "./frontend/src/lib/useGenerateStorageActions";

describe("generate storage actions", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as { window?: Window & typeof globalThis }).window;
  const originalNavigator = globalThis.navigator;
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    (globalThis as { fetch?: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/naskah") {
        return new Response(
          JSON.stringify({ data: { id: "n1", fileUrl: "https://files.example/n1.pdf" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "/api/templates") {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url === "/api/export/n1/pdf") {
        return new Response(new Blob(["pdf"]), {
          status: 200,
          headers: { "X-Storage-Url": "https://files.example/n1.pdf" }
        });
      }
      throw new Error(`Unexpected fetch ${url} ${init?.method ?? "GET"}`);
    }) as typeof fetch;

    const store = new Map<string, string>();
    (globalThis as { window?: Window & typeof globalThis }).window = globalThis as Window & typeof globalThis;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key)
      }
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writes: [] as string[],
          writeText(text: string) {
            this.writes.push(text);
            return Promise.resolve();
          }
        }
      }
    });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: {
          appendChild() {}
        },
        createElement() {
          return {
            style: {},
            click() {},
            remove() {}
          };
        }
      }
    });
    window.prompt = () => "Template Ceramah";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
    Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  test("save clears draft marker and sets success state", async () => {
    let savedId = "";
    let exportUrl = "";
    let draftStatus = "Draft lokal tersimpan.";
    let manualDirty = true;
    let tone = "neutral";
    let message = "";
    let saving = false;
    const manualDraftKey = "draft:key";
    window.localStorage.setItem(manualDraftKey, "isi draft");

    const actions = useGenerateStorageActions({
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", durasi: "15 menit" },
      content: "Isi naskah",
      title: "Judul",
      savedNaskahId: "",
      exportUrl,
      manualDraftKey,
      setSavedNaskahId: (value) => {
        savedId = value;
      },
      setExportUrl: (value) => {
        exportUrl = value;
      },
      setManualDraftStatus: (value) => {
        draftStatus = value;
      },
      setManualEditDirty: (value) => {
        manualDirty = value;
      },
      setMessageTone: (value) => {
        tone = value;
      },
      setMessage: (value) => {
        message = value;
      },
      setSaving: (value) => {
        saving = value;
      },
      setExporting() {}
    });

    await actions.save();
    expect(savedId).toBe("n1");
    expect(exportUrl).toBe("https://files.example/n1.pdf");
    expect(window.localStorage.getItem(manualDraftKey)).toBeNull();
    expect(draftStatus).toBe("");
    expect(manualDirty).toBe(false);
    expect(tone).toBe("success");
    expect(message).toBe("Naskah berhasil disimpan.");
    expect(saving).toBe(false);
  });

  test("copyExportLink writes latest export url to clipboard", async () => {
    let tone = "neutral";
    let message = "";
    const actions = useGenerateStorageActions({
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", durasi: "15 menit" },
      content: "Isi naskah",
      title: "Judul",
      savedNaskahId: "n1",
      exportUrl: "https://files.example/n1.pdf",
      manualDraftKey: "draft:key",
      setSavedNaskahId() {},
      setExportUrl() {},
      setManualDraftStatus() {},
      setManualEditDirty() {},
      setMessageTone: (value) => {
        tone = value;
      },
      setMessage: (value) => {
        message = value;
      },
      setSaving() {},
      setExporting() {}
    });

    await actions.copyExportLink();
    const clipboard = (globalThis.navigator as Navigator & { clipboard: { writes: string[] } }).clipboard;
    expect(clipboard.writes[0]).toBe("https://files.example/n1.pdf");
    expect(tone).toBe("success");
    expect(message).toBe("Link export berhasil disalin.");
  });
});
