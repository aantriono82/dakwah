import type { RefObject } from "react";
import { IconCopy, IconMoveDown, IconMoveUp, IconRotateCcw, IconSparkles } from "../icons";
import { NaskahPreview } from "../NaskahPreview";
import { Button, Notice, Textarea } from "../ui";
import { cn } from "../../lib/utils";
import type { SectionBlock, SectionMarker } from "../../lib/generate-sections";

type SectionAiAction = "" | "polish" | "shorten" | "dalil" | "closing";

export function GenerateSectionWorkspace({
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
  previewPanelRef,
  focusMode,
  loading,
  manualEditDirty,
  manualDraftStatus
}: {
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
  previewPanelRef: RefObject<HTMLDivElement | null>;
  focusMode: boolean;
  loading: boolean;
  manualEditDirty: boolean;
  manualDraftStatus: string;
}) {
  return (
    <>
      <div className="grid gap-3">
        <div className={cn("grid gap-2", focusMode && "hidden")}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outline</p>
          <div className="grid gap-3">
            {activeSection && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-foreground">Section aktif</p>
                <p className="mt-1 text-xs text-muted-foreground">{activeSection.label}</p>
              </div>
            )}
            <div className="grid gap-3 2xl:grid-cols-2 2xl:items-start">
              <div className="grid gap-2">
                <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Aksi editor</p>
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                  <Button type="button" className="h-9 justify-start bg-secondary text-secondary-foreground" onClick={copySection} disabled={!activeSection}>
                    <IconCopy className="size-4" />
                    Salin section
                  </Button>
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => moveSection(-1)}
                    disabled={!activeSection || activeSectionIndex <= 0}
                  >
                    <IconMoveUp className="size-4" />
                    Naikkan section
                  </Button>
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => moveSection(1)}
                    disabled={!activeSection || activeSectionIndex < 0 || activeSectionIndex >= sectionBlocks.length - 1}
                  >
                    <IconMoveDown className="size-4" />
                    Turunkan section
                  </Button>
                  <Button type="button" className="h-9 justify-start bg-secondary text-secondary-foreground" onClick={duplicateSection} disabled={!activeSection}>
                    <IconSparkles className="size-4" />
                    Duplikat section
                  </Button>
                  <Button type="button" className="h-9 justify-start bg-secondary text-secondary-foreground" onClick={cleanupSpacing} disabled={!content.trim()}>
                    <IconRotateCcw className="size-4" />
                    Rapikan spasi
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Aksi AI per section</p>
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => refineActiveSection("polish")}
                    disabled={!activeSection || Boolean(sectionAiLoading)}
                  >
                    <IconSparkles className="size-4" />
                    {sectionAiLoading === "polish" ? "Memproses..." : "Perhalus section"}
                  </Button>
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => refineActiveSection("shorten")}
                    disabled={!activeSection || Boolean(sectionAiLoading)}
                  >
                    <IconSparkles className="size-4" />
                    {sectionAiLoading === "shorten" ? "Memproses..." : "Pendekkan section"}
                  </Button>
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => refineActiveSection("dalil")}
                    disabled={!activeSection || Boolean(sectionAiLoading)}
                  >
                    <IconSparkles className="size-4" />
                    {sectionAiLoading === "dalil" ? "Memproses..." : "Perkuat dalil"}
                  </Button>
                  <Button
                    type="button"
                    className="h-9 justify-start bg-secondary text-secondary-foreground"
                    onClick={() => refineActiveSection("closing")}
                    disabled={!activeSection || Boolean(sectionAiLoading)}
                  >
                    <IconSparkles className="size-4" />
                    {sectionAiLoading === "closing" ? "Memproses..." : "Kuatkan penutup"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-2">
            {sectionMarkers.length > 0 ? (
              <div className="grid max-h-52 gap-1 overflow-auto">
                {sectionMarkers.map((section, index) => (
                  <button
                    key={`${section.label}-${section.line}`}
                    type="button"
                    className="grid gap-1 rounded-md px-2 py-2 text-left transition hover:bg-accent"
                    onClick={() => jumpToSection(section.line)}
                  >
                    <span className="text-xs font-medium text-foreground">{index + 1}. {section.label}</span>
                    {section.preview && <span className="line-clamp-2 text-xs text-muted-foreground">{section.preview}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">Outline akan muncul setelah naskah memiliki heading section.</p>
            )}
          </div>
        </div>
        <div className={cn("grid gap-3", focusMode ? "min-h-[60vh]" : "2xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)] 2xl:items-start")}>
          <div className="grid min-h-[320px] gap-2 sm:min-h-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Editor</p>
              {!focusMode && sectionMarkers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sectionMarkers.map((section) => (
                    <button
                      key={`${section.label}-${section.line}`}
                      type="button"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                      onClick={() => jumpToSection(section.line)}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              ref={editorRef}
              className={cn("resize-y text-justify font-mono leading-6", focusMode ? "min-h-[60vh] sm:min-h-[68vh] xl:min-h-[78vh]" : "min-h-[320px] sm:min-h-[420px] xl:min-h-[560px]")}
              value={content}
              onChange={(event) => handleManualContentChange(event.target.value)}
              onClick={updateCursorPosition}
              onKeyUp={updateCursorPosition}
              onSelect={updateCursorPosition}
              onScroll={handleEditorScroll}
              placeholder="Hasil generate akan muncul di sini dan bisa langsung Anda revisi."
            />
          </div>
          <div className={cn("grid min-h-[320px] gap-2 sm:min-h-[420px]", focusMode && "hidden")}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <div ref={previewPanelRef} className="min-h-[320px] rounded-md border border-border bg-background p-3 sm:min-h-[420px] xl:min-h-[400px]">
              <NaskahPreview
                content={content}
                loading={loading}
                activeSectionLabel={activeSection?.label}
                scrollViewportRef={previewViewportRef}
                onViewportScroll={handlePreviewScroll}
              />
            </div>
          </div>
        </div>
      </div>
      {manualEditDirty && (
        <Notice>
          Isi telah diubah manual. Jalankan tinjau ulang bila Anda ingin memperbarui panel kualitas sebelum menyimpan.
        </Notice>
      )}
      {manualDraftStatus && <p className="text-xs text-muted-foreground">{manualDraftStatus}</p>}
    </>
  );
}
