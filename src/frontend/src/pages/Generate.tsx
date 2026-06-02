import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save } from "lucide-react";
import { defaultParameters, FormKhutbah } from "../components/FormKhutbah";
import { JenisCard } from "../components/JenisCard";
import { NaskahPreview } from "../components/NaskahPreview";
import { Button, Card, Field, Input } from "../components/ui";
import { api, jenisOptions, type JenisId } from "../lib/utils";
import { validateGenerateParameters } from "../lib/validation";
import type { Template } from "../types";

export function Generate({
  initialJenis,
  template,
  onTemplateApplied
}: {
  initialJenis: JenisId;
  template: Template | null;
  onTemplateApplied: () => void;
}) {
  const [jenis, setJenis] = useState<JenisId>(initialJenis);
  const [parameters, setParameters] = useState(defaultParameters(initialJenis));
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    changeJenis(initialJenis);
  }, [initialJenis]);

  useEffect(() => {
    if (!template) return;
    setJenis(template.jenis);
    setParameters({ ...defaultParameters(template.jenis), ...template.parameters });
    setContent("");
    setTitle("");
    setMessage(`Template "${template.name}" siap dipakai.`);
    onTemplateApplied();
  }, [onTemplateApplied, template]);

  function changeJenis(next: JenisId) {
    setJenis(next);
    setParameters(defaultParameters(next));
    setContent("");
    setTitle("");
    setMessage("");
  }

  const selectedLabel = useMemo(() => jenisOptions.find((item) => item.id === jenis)?.label ?? "Naskah", [jenis]);

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
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setContent("");
    setMessage("");
    setTitle(makeTitle());
    const controller = new AbortController();
    const waitingTimer = window.setTimeout(() => {
      setMessage("Menunggu respons dari provider AI...");
    }, 3000);
    const timeoutTimer = window.setTimeout(() => {
      controller.abort();
    }, 120000);

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
        setMessage("Generate terlalu lama. Coba ulangi atau pilih model lain.");
      } else {
        setMessage("Koneksi streaming gagal. Mencoba mode kompatibilitas...");
        try {
          await generateWithoutStream();
          setMessage("");
        } catch (fallbackError) {
          setMessage(fallbackError instanceof Error ? fallbackError.message : "Generate gagal.");
        }
      }
    } finally {
      window.clearTimeout(waitingTimer);
      window.clearTimeout(timeoutTimer);
      setLoading(false);
    }
  }

  async function save() {
    if (!content.trim()) {
      setMessage("Generate naskah terlebih dahulu.");
      return;
    }

    await api("/api/naskah", {
      method: "POST",
      body: JSON.stringify({ title, jenis, bahasa: parameters.bahasa, duration: parameters.durasi, parameters, content })
    });
    setMessage("Naskah berhasil disimpan.");
  }

  async function saveTemplate() {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    const name = window.prompt("Nama template");
    if (!name) return;
    await api("/api/templates", { method: "POST", body: JSON.stringify({ name, jenis, parameters }) });
    setMessage("Template berhasil disimpan.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {jenisOptions.map((item) => (
            <JenisCard key={item.id} item={item} active={jenis === item.id} onClick={changeJenis} />
          ))}
        </div>
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Parameter {selectedLabel}</h2>
          <FormKhutbah jenis={jenis} values={parameters} onChange={setParameters} />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button onClick={generate} disabled={loading}>
              <RefreshCcw className="size-4" />
              {loading ? "Generate..." : "Generate AI"}
            </Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={saveTemplate}>
              <Save className="size-4" />
              Template
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-4">
        <Card className="p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <Field label="Judul naskah">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedLabel}: tema`} />
            </Field>
            <div className="flex items-end gap-2">
              <Button onClick={save} disabled={!content || loading}>
                <Save className="size-4" />
                Simpan
              </Button>
            </div>
          </div>
          {message && <p className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <NaskahPreview content={content} loading={loading} />
        </Card>
      </section>
    </div>
  );
}
