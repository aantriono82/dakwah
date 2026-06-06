import { AlertTriangle, CheckCircle2, Copy, Download, FileDown, History as HistoryIcon, Pencil, RotateCcw, Save, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { NaskahPreview } from "../components/NaskahPreview";
import { Badge, Button, Card, Field, IconButton, Input, Notice, Select, Textarea } from "../components/ui";
import { api, cn, downloadBlob, jenisOptions, type JenisId } from "../lib/utils";
import type { Naskah, NaskahVersion, QualityReport, User } from "../types";

export function History({ user, initialQuery = "", selectedId = "" }: { user: User; initialQuery?: string; selectedId?: string }) {
  const [items, setItems] = useState<Naskah[]>([]);
  const [selected, setSelected] = useState<Naskah | null>(null);
  const [exportLinks, setExportLinks] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [jenisFilter, setJenisFilter] = useState<"all" | JenisId>("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "final">("draft");
  const [savingEdit, setSavingEdit] = useState(false);
  const [exporting, setExporting] = useState<"" | "pdf" | "docx">("");
  const [versions, setVersions] = useState<NaskahVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ data: Naskah[] }>("/api/naskah");
      setItems(data.data);
      setSelected((current) => {
        if (selectedId) return data.data.find((item) => item.id === selectedId) ?? current ?? data.data[0] ?? null;
        if (!current) return data.data[0] ?? null;
        return data.data.find((item) => item.id === current.id) ?? data.data[0] ?? null;
      });
      setExportLinks(
        Object.fromEntries(data.data.filter((item) => item.fileUrl).map((item) => [item.id, item.fileUrl as string]))
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!selectedId || items.length === 0) return;
    const item = items.find((current) => current.id === selectedId);
    if (item) {
      setSelected(item);
      setEditing(false);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (!selected) {
      setVersions([]);
      return;
    }
    void loadVersions(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (!editing || !selected) return;
    if (editTitle === selected.title && editContent === selected.content && editStatus === (selected.status ?? "draft")) return;

    setAutosaveStatus("Menyimpan draft...");
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<{ data: Naskah }>(`/api/naskah/${selected.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: editTitle,
            content: editContent,
            status: editStatus,
            autosave: true
          })
        });
        setSelected(data.data);
        setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, ...data.data } : item)));
        setAutosaveStatus("Draft tersimpan");
      } catch {
        setAutosaveStatus("Autosave gagal");
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [editing, editTitle, editContent, editStatus, selected]);

  async function loadVersions(id: string) {
    setLoadingVersions(true);
    try {
      const data = await api<{ data: NaskahVersion[] }>(`/api/naskah/${id}/versions`);
      setVersions(data.data);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus naskah ini?")) return;
    setMessage("");
    await api(`/api/naskah/${id}`, { method: "DELETE" });
    setSelected(null);
    setEditing(false);
    await load();
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Link export berhasil disalin.");
  }

  async function exportFile(id: string, format: "pdf" | "docx") {
    if (exporting) return;
    setExporting(format);
    setMessage("");
    try {
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
            setExporting("");
            await exportFile(id, "docx");
          }
        }

        return;
      }

      const storageUrl = response.headers.get("X-Storage-Url") ?? "";
      const blob = await response.blob();
      downloadBlob(blob, `naskah.${format}`);

      if (storageUrl) {
        setExportLinks((current) => ({ ...current, [id]: storageUrl }));
        setItems((current) => current.map((item) => (item.id === id ? { ...item, fileUrl: storageUrl } : item)));
        setSelected((current) => (current?.id === id ? { ...current, fileUrl: storageUrl } : current));
        setMessage("Export selesai. Link file siap dibagikan.");
      } else {
        setMessage("Export selesai. Link storage belum tersedia.");
      }
    } finally {
      setExporting("");
    }
  }

  function startEdit(item: Naskah) {
    setEditing(true);
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditStatus(item.status ?? "draft");
    setAutosaveStatus("");
    setMessage("");
  }

  function cancelEdit() {
    setEditing(false);
    setEditTitle("");
    setEditContent("");
    setAutosaveStatus("");
  }

  async function saveEdit() {
    if (!selected) return;
    if (editTitle.trim().length < 3) {
      setMessage("Judul minimal 3 karakter.");
      return;
    }
    if (editContent.trim().length < 20) {
      setMessage("Isi naskah minimal 20 karakter.");
      return;
    }

    setSavingEdit(true);
    setMessage("");
    try {
      const data = await api<{ data: Naskah }>(`/api/naskah/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle, content: editContent, status: editStatus, changeSummary: "Simpan manual dari editor" })
      });
      setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, ...data.data } : item)));
      setSelected(data.data);
      setEditing(false);
      await loadVersions(selected.id);
      setMessage("Naskah berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui naskah.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function restoreVersion(versionId: string) {
    if (!selected || !confirm("Kembalikan isi naskah ke versi ini? Versi saat ini tetap disimpan sebagai snapshot baru.")) return;
    setMessage("");
    const data = await api<{ data: Naskah }>(`/api/naskah/${selected.id}/versions/${versionId}/restore`, { method: "POST", body: "{}" });
    setSelected(data.data);
    setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, ...data.data } : item)));
    setEditing(false);
    await loadVersions(selected.id);
    setMessage("Versi naskah berhasil dikembalikan.");
  }

  async function refineSelected() {
    if (!selected || refineInstruction.trim().length < 5) {
      setMessage("Isi instruksi revisi minimal 5 karakter.");
      return;
    }

    setRefining(true);
    setMessage("");
    try {
      const data = await api<{ data: Naskah }>(`/api/naskah/${selected.id}/refine`, {
        method: "POST",
        body: JSON.stringify({ instruction: refineInstruction })
      });
      setSelected(data.data);
      setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, ...data.data } : item)));
      setRefineInstruction("");
      await loadVersions(selected.id);
      setMessage("Naskah berhasil direvisi AI dan disimpan sebagai versi baru.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revisi AI gagal.");
    } finally {
      setRefining(false);
    }
  }

  const selectedLink = selected ? exportLinks[selected.id] || selected.fileUrl || "" : "";
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesJenis = jenisFilter === "all" || item.jenis === jenisFilter;
    const searchable = [item.title, item.bahasa, item.content, item.user?.name, item.user?.username].filter(Boolean).join(" ").toLowerCase();
    return matchesJenis && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge>Riwayat</Badge>
          <h2 className="mt-3 text-2xl font-semibold">Naskah tersimpan</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cari, buka pratinjau, export ulang, atau salin link dokumen dari satu tempat.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="grid gap-3">
        <Card className="grid gap-3 p-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul, isi, bahasa, atau user"
            aria-label="Cari riwayat"
          />
          <Select value={jenisFilter} onChange={(event) => setJenisFilter(event.target.value as "all" | JenisId)} aria-label="Filter jenis naskah">
            <option value="all">Semua jenis</option>
            {jenisOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {filteredItems.length} dari {items.length} naskah
          </p>
        </Card>
        {loading && <EmptyState text="Memuat riwayat..." />}
        {filteredItems.map((item) => (
          <button key={item.id} className="text-left" onClick={() => { setSelected(item); setEditing(false); }}>
            <Card className={cn("p-4 transition hover:border-primary", selected?.id === item.id && "border-primary")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.user && user.role === "admin" ? `${item.user.name} - ` : ""}
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge>{item.bahasa}</Badge>
              </div>
            </Card>
          </button>
        ))}
        {!loading && items.length === 0 && <EmptyState text="Belum ada riwayat." />}
        {items.length > 0 && filteredItems.length === 0 && <EmptyState text="Tidak ada naskah yang cocok." />}
      </section>
      <section>
        {selected ? (
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{selected.bahasa}</Badge>
                  <Badge>{jenisOptions.find((item) => item.id === selected.jenis)?.label ?? selected.jenis}</Badge>
                  {selected.duration && <Badge>{selected.duration}</Badge>}
                  <Badge>v{selected.version ?? 1}</Badge>
                  <Badge>{selected.status === "final" ? "Final" : "Draft"}</Badge>
                  {typeof selected.qualityScore === "number" && <Badge>Skor {selected.qualityScore}</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-secondary text-secondary-foreground" onClick={() => exportFile(selected.id, "pdf")}>
                  <FileDown className="size-4" />
                  {exporting === "pdf" ? "PDF..." : "PDF"}
                </Button>
                <Button className="bg-secondary text-secondary-foreground" onClick={() => exportFile(selected.id, "docx")}>
                  <Download className="size-4" />
                  {exporting === "docx" ? "DOCX..." : "DOCX"}
                </Button>
                <IconButton onClick={() => startEdit(selected)} aria-label="Edit naskah" disabled={editing || Boolean(exporting)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton onClick={() => remove(selected.id)} aria-label="Hapus">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
            {message && <Notice className="mb-3">{message}</Notice>}
            {selectedLink && (
              <div className="mb-4 grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
                <Input value={selectedLink} readOnly aria-label="Link export" />
                <Button className="bg-secondary text-secondary-foreground" onClick={() => copyLink(selectedLink)}>
                  <Copy className="size-4" />
                  Copy link
                </Button>
              </div>
            )}
            {editing ? (
              <div className="grid gap-4 rounded-lg border border-border bg-background p-4">
                <Field label="Judul naskah">
                  <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                </Field>
                <Field label="Status naskah">
                  <Select value={editStatus} onChange={(event) => setEditStatus(event.target.value as "draft" | "final")}>
                    <option value="draft">Draft</option>
                    <option value="final">Final</option>
                  </Select>
                </Field>
                <Field label="Isi naskah">
                  <Textarea className="min-h-[420px] font-mono leading-6" value={editContent} onChange={(event) => setEditContent(event.target.value)} />
                </Field>
                {autosaveStatus && <p className="text-xs text-muted-foreground">{autosaveStatus}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveEdit} disabled={savingEdit}>
                    <Save className="size-4" />
                    {savingEdit ? "Menyimpan..." : "Simpan perubahan"}
                  </Button>
                  <Button type="button" className="bg-secondary text-secondary-foreground" onClick={cancelEdit} disabled={savingEdit}>
                    <X className="size-4" />
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <QualityPanel report={selected.qualityReport ?? null} />
                <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <p className="text-sm font-medium">Revisi AI</p>
                  </div>
                  <Textarea
                    className="min-h-24"
                    value={refineInstruction}
                    onChange={(event) => setRefineInstruction(event.target.value)}
                    placeholder="Contoh: Perhalus bagian penutup dan tambah ajakan praktis untuk jamaah."
                  />
                  <div>
                    <Button onClick={refineSelected} disabled={refining || Boolean(exporting)}>
                      <Sparkles className="size-4" />
                      {refining ? "Merevisi..." : "Revisi dan simpan versi"}
                    </Button>
                  </div>
                </div>
                <NaskahPreview content={selected.content} loading={false} />
                <VersionsPanel versions={versions} loading={loadingVersions} onRestore={restoreVersion} />
              </div>
            )}
          </Card>
        ) : (
          <EmptyState text="Pilih naskah untuk melihat pratinjau." />
        )}
      </section>
      </div>
    </div>
  );
}

function QualityPanel({ report }: { report: QualityReport | null }) {
  if (!report) return null;
  const failedChecks = report.checks.filter((check) => !check.passed);

  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {report.reviewRequired ? <AlertTriangle className="size-4 text-amber-600" /> : <CheckCircle2 className="size-4 text-primary" />}
          <p className="text-sm font-medium">Quality guard</p>
        </div>
        <Badge>Skor {report.score}/100</Badge>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>{report.wordCount.toLocaleString("id-ID")} kata</p>
        <p>{report.reviewRequired ? "Perlu tinjauan khusus sebelum dipakai" : "Tetap tinjau dalil sebelum disampaikan"}</p>
      </div>
      {report.metrics?.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {report.metrics.map((metric) => (
            <div key={metric.id} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{metric.label}</p>
                <Badge>{metric.score}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {failedChecks.length > 0 && (
        <div className="grid gap-2">
          {failedChecks.map((check) => (
            <div key={check.id} className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-xs font-semibold">{check.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionsPanel({
  versions,
  loading,
  onRestore
}: {
  versions: NaskahVersion[];
  loading: boolean;
  onRestore: (versionId: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-4 text-primary" />
        <p className="text-sm font-medium">Versi naskah</p>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Memuat versi...</p>}
      {!loading && versions.length === 0 && <p className="text-xs text-muted-foreground">Belum ada snapshot versi.</p>}
      {!loading &&
        versions.slice(0, 6).map((version) => (
          <div key={version.id} className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-medium">
                v{version.versionNumber} - {version.changeSummary}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(version.createdAt).toLocaleString("id-ID")}
                {typeof version.qualityScore === "number" ? ` - Skor ${version.qualityScore}` : ""}
              </p>
            </div>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => onRestore(version.id)}>
              <RotateCcw className="size-4" />
              Restore
            </Button>
          </div>
        ))}
    </div>
  );
}
