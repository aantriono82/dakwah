import { Copy, Download, FileDown, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { NaskahPreview } from "../components/NaskahPreview";
import { Button, Card, IconButton, Input } from "../components/ui";
import { api, cn } from "../lib/utils";
import type { Naskah, User } from "../types";

export function History({ user }: { user: User }) {
  const [items, setItems] = useState<Naskah[]>([]);
  const [selected, setSelected] = useState<Naskah | null>(null);
  const [exportLinks, setExportLinks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ data: Naskah[] }>("/api/naskah");
    setItems(data.data);
    setSelected((current) => current ?? data.data[0] ?? null);
    setExportLinks(
      Object.fromEntries(data.data.filter((item) => item.fileUrl).map((item) => [item.id, item.fileUrl as string]))
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Hapus naskah ini?")) return;
    await api(`/api/naskah/${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Link export berhasil disalin.");
  }

  async function exportFile(id: string, format: "pdf" | "docx") {
    setMessage("");
    const response = await fetch(`/api/export/${id}/${format}`, { method: "POST", credentials: "include" });
    if (!response.ok) {
      let errorMessage = "Export gagal.";
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) errorMessage = data.message;
      } catch {
        // ignore invalid JSON error body
      }

      setMessage(errorMessage);

      if (format === "pdf") {
        const shouldFallback = confirm(`${errorMessage}\n\nCoba export format DOCX sekarang?`);
        if (shouldFallback) {
          await exportFile(id, "docx");
        }
      }

      return;
    }

    const storageUrl = response.headers.get("X-Storage-Url") ?? "";
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `naskah.${format}`;
    link.click();
    URL.revokeObjectURL(url);

    if (storageUrl) {
      setExportLinks((current) => ({ ...current, [id]: storageUrl }));
      setSelected((current) => (current?.id === id ? { ...current, fileUrl: storageUrl } : current));
      setMessage("Export selesai. Link file siap dibagikan.");
    } else {
      setMessage("Export selesai. Link storage belum tersedia.");
    }
  }

  const selectedLink = selected ? exportLinks[selected.id] || selected.fileUrl || "" : "";

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="grid gap-3">
        {items.map((item) => (
          <button key={item.id} className="text-left" onClick={() => setSelected(item)}>
            <Card className={cn("p-4 transition hover:border-primary", selected?.id === item.id && "border-primary")}>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.user && user.role === "admin" ? `${item.user.name} - ` : ""}
                {new Date(item.createdAt).toLocaleString("id-ID")}
              </p>
            </Card>
          </button>
        ))}
        {items.length === 0 && <EmptyState text="Belum ada riwayat." />}
      </section>
      <section>
        {selected ? (
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-sm text-muted-foreground">{selected.bahasa}</p>
              </div>
              <div className="flex gap-2">
                <IconButton onClick={() => exportFile(selected.id, "pdf")} aria-label="Export PDF">
                  <FileDown className="size-4" />
                </IconButton>
                <IconButton onClick={() => exportFile(selected.id, "docx")} aria-label="Export DOCX">
                  <Download className="size-4" />
                </IconButton>
                <IconButton onClick={() => remove(selected.id)} aria-label="Hapus">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
            {message && <p className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
            {selectedLink && (
              <div className="mb-4 grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
                <Input value={selectedLink} readOnly aria-label="Link export" />
                <Button className="bg-secondary text-secondary-foreground" onClick={() => copyLink(selectedLink)}>
                  <Copy className="size-4" />
                  Copy link
                </Button>
              </div>
            )}
            <NaskahPreview content={selected.content} loading={false} />
          </Card>
        ) : (
          <EmptyState text="Pilih naskah untuk melihat pratinjau." />
        )}
      </section>
    </div>
  );
}
