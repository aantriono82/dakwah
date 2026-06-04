import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, FileDown, RefreshCcw, Save } from "lucide-react";
import { defaultParameters, FormKhutbah } from "../components/FormKhutbah";
import { JenisCard } from "../components/JenisCard";
import { NaskahPreview } from "../components/NaskahPreview";
import { Badge, Button, Card, Field, Input, Notice } from "../components/ui";
import { api, downloadBlob, jenisOptions, type JenisId } from "../lib/utils";
import { validateGenerateParameters } from "../lib/validation";
import type { Naskah, Template } from "../types";

const defaultGenerateTimeoutMs = 120000;

export function Generate({
  initialJenis,
  allowedJenis = jenisOptions.map((item) => item.id),
  template,
  onTemplateApplied
}: {
  initialJenis: JenisId;
  allowedJenis?: JenisId[];
  template: Template | null;
  onTemplateApplied: () => void;
}) {
  const [jenis, setJenis] = useState<JenisId>(initialJenis);
  const [parameters, setParameters] = useState(defaultParameters(initialJenis));
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [generateTimeoutMs, setGenerateTimeoutMs] = useState(defaultGenerateTimeoutMs);
  const [savedNaskahId, setSavedNaskahId] = useState("");
  const [exporting, setExporting] = useState<"" | "pdf" | "docx">("");
  const [saving, setSaving] = useState(false);
  const [exportUrl, setExportUrl] = useState("");

  useEffect(() => {
    changeJenis(initialJenis);
  }, [initialJenis]);

  useEffect(() => {
    if (!template) return;
    setJenis(template.jenis);
    setParameters({ ...defaultParameters(template.jenis), ...template.parameters });
    setContent("");
    setTitle("");
    setSavedNaskahId("");
    setExportUrl("");
    setMessageTone("success");
    setMessage(`Template "${template.name}" siap dipakai.`);
    onTemplateApplied();
  }, [onTemplateApplied, template]);

  useEffect(() => {
    api<{ data: { generateClientTimeoutMs: number } }>("/api/config")
      .then((data) => {
        if (Number.isFinite(data.data.generateClientTimeoutMs)) {
          setGenerateTimeoutMs(data.data.generateClientTimeoutMs);
        }
      })
      .catch(() => null);
  }, []);

  function changeJenis(next: JenisId) {
    setJenis(next);
    setParameters(defaultParameters(next));
    setContent("");
    setTitle("");
    setSavedNaskahId("");
    setExportUrl("");
    setMessage("");
  }

  const selectedLabel = useMemo(() => jenisOptions.find((item) => item.id === jenis)?.label ?? "Naskah", [jenis]);
  const visibleJenisOptions = useMemo(() => jenisOptions.filter((item) => allowedJenis.includes(item.id)), [allowedJenis]);
  const validationMessage = useMemo(() => validateGenerateParameters(jenis, parameters), [jenis, parameters]);
  const hasContent = content.trim().length > 0;
  const wordCount = hasContent ? content.trim().split(/\s+/).length : 0;

  function makeTitle() {
    return `${selectedLabel}: ${parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan || "Tanpa Tema"}`;
  }

  async function generateWithoutStream() {
    const data = await api<{ title: string; content: string }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({ jenis, parameters })
    });
    setTitle(data.title);
    setContent(data.content);
  }

  async function generate() {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setContent("");
    setSavedNaskahId("");
    setExportUrl("");
    setMessageTone("neutral");
    setMessage("");
    setTitle(makeTitle());
    const controller = new AbortController();
    const waitingTimer = window.setTimeout(() => {
      setMessageTone("neutral");
      setMessage("Menunggu respons dari provider AI. Jika model pertama penuh, aplikasi akan mencoba model berikutnya...");
    }, 3000);
    const timeoutTimer = window.setTimeout(() => {
      controller.abort();
    }, generateTimeoutMs);

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenis, parameters })
      });
      if (!response.ok || !response.body) throw new Error("Generate gagal.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        window.clearTimeout(waitingTimer);
        setMessage("");
        setContent((current) => current + decoder.decode(value, { stream: true }));
      }
      const remainder = decoder.decode();
      if (remainder) setContent((current) => current + remainder);
    } catch (error) {
      window.clearTimeout(waitingTimer);
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (isAbort) {
        setMessageTone("error");
        setMessage("Generate terlalu lama. Coba ulangi, kurangi durasi, atau ganti daftar model.");
      } else {
        setMessageTone("neutral");
        setMessage("Koneksi streaming gagal. Mencoba mode kompatibilitas...");
        try {
          await generateWithoutStream();
          setMessageTone("success");
          setMessage("");
        } catch (fallbackError) {
          setMessageTone("error");
          setMessage(fallbackError instanceof Error ? fallbackError.message : "Generate gagal.");
        }
      }
    } finally {
      window.clearTimeout(waitingTimer);
      window.clearTimeout(timeoutTimer);
      setLoading(false);
    }
  }

  async function saveGeneratedNaskah() {
    if (!content.trim()) {
      throw new Error("Generate naskah terlebih dahulu.");
    }

    const data = await api<{ data: Naskah }>("/api/naskah", {
      method: "POST",
      body: JSON.stringify({ title, jenis, bahasa: parameters.bahasa, duration: parameters.durasi, parameters, content })
    });
    setSavedNaskahId(data.data.id);
    setExportUrl(data.data.fileUrl ?? "");
    return data.data;
  }

  async function save() {
    setSaving(true);
    try {
      await saveGeneratedNaskah();
      setMessageTone("success");
      setMessage("Naskah berhasil disimpan.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan naskah.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
      return;
    }

    const name = window.prompt("Nama template");
    if (!name) return;
    await api("/api/templates", { method: "POST", body: JSON.stringify({ name, jenis, parameters }) });
    setMessageTone("success");
    setMessage("Template berhasil disimpan.");
  }

  async function exportFile(format: "pdf" | "docx") {
    setExporting(format);
    setMessage("");
    try {
      const exportId = savedNaskahId || (await saveGeneratedNaskah()).id;
      const response = await fetch(`/api/export/${exportId}/${format}`, { method: "POST", credentials: "include" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Export gagal.");
      }

      const storageUrl = response.headers.get("X-Storage-Url") ?? "";
      const blob = await response.blob();
      downloadBlob(blob, `${title || "naskah"}.${format}`);
      if (storageUrl) setExportUrl(storageUrl);
      setMessageTone("success");
      setMessage(storageUrl ? "Export selesai. File sudah diunduh dan link siap disalin." : "Export selesai. File sudah diunduh.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Export gagal.");
    } finally {
      setExporting("");
    }
  }

  async function copyExportLink() {
    if (!exportUrl) {
      setMessageTone("error");
      setMessage("Export naskah terlebih dahulu untuk membuat link.");
      return;
    }

    await navigator.clipboard.writeText(exportUrl);
    setMessageTone("success");
    setMessage("Link export berhasil disalin.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <section className="grid gap-4">
        <div className="grid gap-3">
          <div>
            <h2 className="text-lg font-semibold">Jenis naskah</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih format, isi parameter utama, lalu generate.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {visibleJenisOptions.map((item) => (
              <JenisCard key={item.id} item={item} active={jenis === item.id} onClick={changeJenis} />
            ))}
          </div>
        </div>
        <Card className="p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Parameter {selectedLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Bahasa, durasi, dan konteks akan ikut dikirim ke AI.</p>
            </div>
            <Badge>{parameters.bahasa ?? "Indonesia"}</Badge>
          </div>
          <FormKhutbah jenis={jenis} values={parameters} onChange={setParameters} />
          {validationMessage && <Notice tone="error" className="mt-4">{validationMessage}</Notice>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button onClick={generate} disabled={loading || saving || Boolean(exporting)}>
              <RefreshCcw className="size-4" />
              {loading ? "Generate..." : "Generate AI"}
            </Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={saveTemplate} disabled={loading || saving || Boolean(exporting)}>
              <Save className="size-4" />
              Template
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-4">
        <Card className="p-4">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <Field label="Judul naskah">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedLabel}: tema`} />
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              <Button onClick={save} disabled={!content || loading || saving || Boolean(exporting)}>
                <Save className="size-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button className="bg-secondary text-secondary-foreground" onClick={() => exportFile("pdf")} disabled={!content || loading || saving || Boolean(exporting)}>
                <FileDown className="size-4" />
                {exporting === "pdf" ? "PDF..." : "PDF"}
              </Button>
              <Button className="bg-secondary text-secondary-foreground" onClick={() => exportFile("docx")} disabled={!content || loading || saving || Boolean(exporting)}>
                <Download className="size-4" />
                {exporting === "docx" ? "DOCX..." : "DOCX"}
              </Button>
              <Button className="bg-secondary text-secondary-foreground" onClick={copyExportLink} disabled={!exportUrl || Boolean(exporting)}>
                <Copy className="size-4" />
                Copy link
              </Button>
            </div>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <Status label="Status" value={loading ? "Generating" : saving ? "Menyimpan" : exporting ? "Exporting" : savedNaskahId ? "Tersimpan" : hasContent ? "Belum disimpan" : "Siap"} />
            <Status label="Jenis" value={selectedLabel} />
            <Status label="Panjang" value={`${wordCount.toLocaleString("id-ID")} kata`} />
          </div>
          {savedNaskahId && (
            <Notice tone="success" className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{exportUrl ? "Naskah tersimpan. Link export siap disalin." : "Naskah tersimpan. Export PDF/DOCX sudah tersedia."}</span>
            </Notice>
          )}
          {exportUrl && (
            <div className="mb-3 grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
              <Input value={exportUrl} readOnly aria-label="Link export terbaru" />
              <Button className="bg-secondary text-secondary-foreground" onClick={copyExportLink}>
                <Copy className="size-4" />
                Copy link
              </Button>
            </div>
          )}
          {message && <Notice tone={messageTone} className="mb-3">{message}</Notice>}
          <NaskahPreview content={content} loading={loading} />
        </Card>
      </section>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
