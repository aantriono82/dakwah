import type { RefObject } from "react";
import { useMemo } from "react";
import { IconCheckCircle, IconCopy, IconDocx, IconMaximize, IconMinimize, IconPdf, IconRotateCcw, IconSave } from "../icons";
import { GenerateSectionWorkspace } from "./GenerateSectionWorkspace";
import { NaskahPreview } from "../NaskahPreview";
import { QualityPanel } from "../QualityPanel";
import { Button, Card, Field, Input, Notice } from "../ui";
import type { SectionBlock, SectionMarker } from "../../lib/generate-sections";
import type { QualityReport } from "../../types";

type QuickFixId = "theme_focus" | "language_flow" | "dalil_alignment";
type SectionAiAction = "" | "polish" | "shorten" | "dalil" | "closing";

export function GenerateEditorPanel({
  title,
  setTitle,
  selectedLabel,
  save,
  loading,
  saving,
  exporting,
  exportFile,
  copyExportLink,
  savedNaskahId,
  exportUrl,
  message,
  messageTone,
  hasContent,
  editorPanelRef,
  previewPanelRef,
  qualityPanelRef,
  focusMode,
  setFocusMode,
  reviewManualDraft,
  reviewingManual,
  activeSection,
  activeSectionIndex,
  sectionBlocks,
  copySection,
  moveSection,
  duplicateSection,
  cleanupSpacing,
  refineActiveSection,
  sectionAiLoading,
  content,
  sectionMarkers,
  jumpToSection,
  editorRef,
  handleManualContentChange,
  updateCursorPosition,
  handleEditorScroll,
  handlePreviewScroll,
  previewViewportRef,
  manualEditDirty,
  manualDraftStatus,
  quality,
  applyQuickFix,
  quickFixLoading,
  lastQuickFixDiff,
  setLastQuickFixDiff,
  wordCount
}: {
  title: string;
  setTitle: (value: string) => void;
  selectedLabel: string;
  save: () => Promise<void>;
  loading: boolean;
  saving: boolean;
  exporting: "" | "pdf" | "docx";
  exportFile: (format: "pdf" | "docx") => Promise<void>;
  copyExportLink: () => Promise<void>;
  savedNaskahId: string;
  exportUrl: string;
  message: string;
  messageTone: "neutral" | "success" | "error";
  hasContent: boolean;
  editorPanelRef: RefObject<HTMLDivElement | null>;
  previewPanelRef: RefObject<HTMLDivElement | null>;
  qualityPanelRef: RefObject<HTMLDivElement | null>;
  focusMode: boolean;
  setFocusMode: (updater: (current: boolean) => boolean) => void;
  reviewManualDraft: () => Promise<void>;
  reviewingManual: boolean;
  activeSection: SectionBlock | null;
  activeSectionIndex: number;
  sectionBlocks: SectionBlock[];
  copySection: () => Promise<void>;
  moveSection: (direction: -1 | 1) => void;
  duplicateSection: () => void;
  cleanupSpacing: () => void;
  refineActiveSection: (action: Exclude<SectionAiAction, "">) => Promise<void>;
  sectionAiLoading: SectionAiAction;
  content: string;
  sectionMarkers: SectionMarker[];
  jumpToSection: (lineNumber: number) => void;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  handleManualContentChange: (nextContent: string) => void;
  updateCursorPosition: () => void;
  handleEditorScroll: () => void;
  handlePreviewScroll: () => void;
  previewViewportRef: RefObject<HTMLDivElement | null>;
  manualEditDirty: boolean;
  manualDraftStatus: string;
  quality: QualityReport | null;
  applyQuickFix: (fixId: QuickFixId) => Promise<void>;
  quickFixLoading: "" | QuickFixId;
  lastQuickFixDiff: { fixId: QuickFixId; before: string; after: string } | null;
  setLastQuickFixDiff: (value: { fixId: QuickFixId; before: string; after: string } | null) => void;
  wordCount: number;
}) {
  return (
    <section className="grid gap-4">
      <Card className="p-4">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <Field label="Judul naskah">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedLabel}: tema`} />
          </Field>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
            <Button onClick={save} disabled={!content || loading || saving || Boolean(exporting)}>
              {saving ? <InlineSpinner /> : <IconSave className="size-4" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button className="bg-muted text-foreground hover:bg-muted/80" onClick={() => exportFile("pdf")} disabled={!content || loading || saving || Boolean(exporting)}>
              {exporting === "pdf" ? <InlineSpinner /> : <IconPdf className="size-4" />}
              {exporting === "pdf" ? "PDF..." : "PDF"}
            </Button>
            <Button className="bg-muted text-foreground hover:bg-muted/80" onClick={() => exportFile("docx")} disabled={!content || loading || saving || Boolean(exporting)}>
              {exporting === "docx" ? <InlineSpinner /> : <IconDocx className="size-4" />}
              {exporting === "docx" ? "DOCX..." : "DOCX"}
            </Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={copyExportLink} disabled={!exportUrl || Boolean(exporting)}>
              <IconCopy className="size-4" />
              Copy link
            </Button>
          </div>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Status
            label="Status"
            value={loading ? "Generating" : saving ? "Menyimpan" : exporting ? "Exporting" : savedNaskahId ? "Tersimpan" : hasContent ? "Belum disimpan" : "Siap"}
            loading={loading}
            tone={savedNaskahId ? "success" : loading || saving || exporting ? "active" : "default"}
          />
          <Status label="Jenis" value={selectedLabel} />
          <Status label="Panjang" value={`${wordCount.toLocaleString("id-ID")} kata`} />
        </div>
        {savedNaskahId && (
          <Notice tone="success" className="mb-3 flex items-center gap-2">
            <IconCheckCircle className="size-4 shrink-0" />
            <span>{exportUrl ? "Naskah tersimpan. Link export siap disalin." : "Naskah tersimpan. Export PDF/DOCX sudah tersedia."}</span>
          </Notice>
        )}
        {exportUrl && (
          <div className="mb-3 grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
            <Input value={exportUrl} readOnly aria-label="Link export terbaru" />
            <Button className="bg-secondary text-secondary-foreground" onClick={copyExportLink}>
              <IconCopy className="size-4" />
              Copy link
            </Button>
          </div>
        )}
        {message && <Notice tone={messageTone} className="mb-3">{message}</Notice>}
        {hasContent && (
          <div ref={editorPanelRef} className="mb-3 grid gap-3 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Revisi manual sebelum simpan</p>
                <p className="text-xs text-muted-foreground">Sunting isi naskah dan lihat hasil bacanya langsung sebelum disimpan atau diexport.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-secondary text-secondary-foreground"
                  onClick={() => setFocusMode((current) => !current)}
                  disabled={!hasContent}
                >
                  {focusMode ? <IconMinimize className="size-4" /> : <IconMaximize className="size-4" />}
                  {focusMode ? "Keluar fokus" : "Mode fokus"}
                </Button>
                <Button
                  className="bg-secondary text-secondary-foreground"
                  onClick={reviewManualDraft}
                  disabled={loading || saving || Boolean(exporting) || reviewingManual || !content.trim()}
                >
                  <IconRotateCcw className="size-4" />
                  {reviewingManual ? "Meninjau..." : "Tinjau ulang"}
                </Button>
              </div>
            </div>
            {focusMode && (
              <Notice>
                Mode fokus menyembunyikan parameter, outline, dan preview agar area menulis lebih lega. Gunakan tombol editor di bawah pada mobile atau keluar dari mode fokus untuk kembali ke tampilan lengkap.
              </Notice>
            )}
            <GenerateSectionWorkspace
              activeSection={activeSection}
              activeSectionIndex={activeSectionIndex}
              sectionBlocks={sectionBlocks}
              copySection={copySection}
              moveSection={moveSection}
              duplicateSection={duplicateSection}
              cleanupSpacing={cleanupSpacing}
              refineActiveSection={refineActiveSection}
              sectionAiLoading={sectionAiLoading}
              content={content}
              sectionMarkers={sectionMarkers}
              jumpToSection={jumpToSection}
              editorRef={editorRef}
              handleManualContentChange={handleManualContentChange}
              updateCursorPosition={updateCursorPosition}
              handleEditorScroll={handleEditorScroll}
              handlePreviewScroll={handlePreviewScroll}
              previewViewportRef={previewViewportRef}
              previewPanelRef={previewPanelRef}
              focusMode={focusMode}
              loading={loading}
              manualEditDirty={manualEditDirty}
              manualDraftStatus={manualDraftStatus}
            />
          </div>
        )}
        <div ref={qualityPanelRef} className="mb-3">
          <QualityPanel report={quality} compact onQuickFix={applyQuickFix} quickFixLoading={quickFixLoading} />
        </div>
        {lastQuickFixDiff && (
          <QuickFixDiffPanel
            fixId={lastQuickFixDiff.fixId}
            before={lastQuickFixDiff.before}
            after={lastQuickFixDiff.after}
            onDismiss={() => setLastQuickFixDiff(null)}
          />
        )}
        {!hasContent && <NaskahPreview content={content} loading={loading} activeSectionLabel={activeSection?.label} />}
      </Card>
    </section>
  );
}

function InlineSpinner() {
  return <span className="inline-button-spinner" aria-hidden="true" />;
}

function Status({
  label,
  value,
  loading = false,
  tone = "default"
}: {
  label: string;
  value: string;
  loading?: boolean;
  tone?: "default" | "active" | "success";
}) {
  const valueClassName =
    tone === "success"
      ? "text-primary"
      : tone === "active"
        ? "text-foreground"
        : "text-foreground";

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {loading ? <span className="generate-status-dot" aria-hidden="true" /> : null}
        <p className={`truncate text-sm font-medium ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}

function QuickFixDiffPanel({
  fixId,
  before,
  after,
  onDismiss
}: {
  fixId: QuickFixId;
  before: string;
  after: string;
  onDismiss: () => void;
}) {
  const entries = useMemo(() => buildLineDiff(before, after), [before, after]);
  const changedEntries = entries.filter((entry) => entry.type !== "same");
  const titleMap = {
    theme_focus: "Perubahan fokus tema",
    language_flow: "Perubahan alur bahasa",
    dalil_alignment: "Perubahan kesesuaian dalil"
  } satisfies Record<QuickFixId, string>;

  return (
    <div className="mb-3 grid gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{titleMap[fixId]}</p>
          <p className="text-xs text-muted-foreground">{changedEntries.length} baris berubah pada quick fix terakhir.</p>
        </div>
        <Button type="button" className="bg-secondary text-secondary-foreground" onClick={onDismiss}>
          Tutup diff
        </Button>
      </div>
      <div className="grid gap-2 rounded-md border border-border bg-background p-3">
        {changedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Quick fix selesai, tetapi tidak ada perubahan teks yang terdeteksi.</p>
        ) : (
          changedEntries.map((entry, index) => (
            <div
              key={`${entry.type}-${index}-${entry.text.slice(0, 24)}`}
              className={
                entry.type === "added"
                  ? "rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground"
                  : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-foreground"
              }
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">{entry.type === "added" ? "+" : "-"}</span>
              <span className="whitespace-pre-wrap break-words">{entry.text || " "}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildLineDiff(before: string, after: string): Array<{ type: "same" | "added" | "removed"; text: string }> {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const dp = Array.from({ length: beforeLines.length + 1 }, () => Array<number>(afterLines.length + 1).fill(0));

  for (let i = beforeLines.length - 1; i >= 0; i -= 1) {
    for (let j = afterLines.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        beforeLines[i] === afterLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const entries: Array<{ type: "same" | "added" | "removed"; text: string }> = [];
  let i = 0;
  let j = 0;

  while (i < beforeLines.length && j < afterLines.length) {
    if (beforeLines[i] === afterLines[j]) {
      entries.push({ type: "same", text: beforeLines[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      entries.push({ type: "removed", text: beforeLines[i] });
      i += 1;
    } else {
      entries.push({ type: "added", text: afterLines[j] });
      j += 1;
    }
  }

  while (i < beforeLines.length) {
    entries.push({ type: "removed", text: beforeLines[i] });
    i += 1;
  }

  while (j < afterLines.length) {
    entries.push({ type: "added", text: afterLines[j] });
    j += 1;
  }

  return entries;
}
