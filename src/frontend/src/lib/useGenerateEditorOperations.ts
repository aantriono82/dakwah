import type { RefObject } from "react";
import { buildSectionBlocks, extractSectionMarkers, type SectionBlock } from "./generate-sections";
import { resetGenerateDraftState } from "./useGeneratePersistence";
import type { MessageTone } from "./generate-draft-types";
import type { QuickFixId } from "./generate-instructions";
import type { JenisId } from "./utils";

export function useGenerateEditorOperations({
  jenis,
  setJenis,
  setParameters,
  onJenisChange,
  content,
  setContent,
  setQuality,
  setTitle,
  setSavedNaskahId,
  setExportUrl,
  setManualEditDirty,
  setManualDraftStatus,
  setLastQuickFixDiff,
  setMobileParametersCollapsed,
  setFocusMode,
  setMessage,
  messageTone,
  setMessageTone,
  editorRef,
  previewViewportRef,
  syncingScrollRef,
  focusMode,
  setCursorPosition,
  cursorPosition,
  activeSection,
  activeSectionIndex,
  sectionBlocks
}: {
  jenis: JenisId;
  setJenis: (value: JenisId) => void;
  setParameters: (value: Record<string, string>) => void;
  onJenisChange?: (jenis: JenisId) => void;
  content: string;
  setContent: (value: string | ((current: string) => string)) => void;
  setQuality: (value: null) => void;
  setTitle: (value: string) => void;
  setSavedNaskahId: (value: string) => void;
  setExportUrl: (value: string) => void;
  setManualEditDirty: (value: boolean) => void;
  setManualDraftStatus: (value: string) => void;
  setLastQuickFixDiff: (value: { fixId: QuickFixId; before: string; after: string } | null) => void;
  setMobileParametersCollapsed: (value: boolean) => void;
  setFocusMode: (value: boolean) => void;
  setMessage: (value: string) => void;
  messageTone: MessageTone;
  setMessageTone: (value: MessageTone) => void;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  previewViewportRef: RefObject<HTMLDivElement | null>;
  syncingScrollRef: RefObject<"" | "editor" | "preview">;
  focusMode: boolean;
  setCursorPosition: (value: number) => void;
  cursorPosition: number;
  activeSection: SectionBlock | null;
  activeSectionIndex: number;
  sectionBlocks: SectionBlock[];
}) {
  function changeJenis(next: JenisId, defaultParametersForJenis: (jenis: JenisId) => Record<string, string>) {
    setJenis(next);
    setParameters(defaultParametersForJenis(next));
    resetGenerateDraftState({
      setContent: setContent as (value: string) => void,
      setQuality,
      setTitle,
      setSavedNaskahId,
      setExportUrl,
      setManualEditDirty,
      setManualDraftStatus,
      setLastQuickFixDiff,
      setMobileParametersCollapsed,
      setFocusMode,
      setMessage
    });
    onJenisChange?.(next);
  }

  function handleManualContentChange(nextContent: string) {
    setContent(nextContent);
    setSavedNaskahId("");
    setExportUrl("");
    setManualEditDirty(true);
    setManualDraftStatus("Menyimpan draft lokal...");
    setLastQuickFixDiff(null);
    if (messageTone !== "error") {
      setMessage("");
    }
  }

  function updateCursorPosition() {
    const editor = editorRef.current;
    if (!editor) return;
    setCursorPosition(editor.selectionStart ?? 0);
  }

  function syncScrollPosition(source: "editor" | "preview") {
    if (syncingScrollRef.current && syncingScrollRef.current !== source) return;
    const editor = editorRef.current;
    const preview = previewViewportRef.current;
    if (!editor || !preview) return;

    syncingScrollRef.current = source;
    if (source === "editor") {
      const editorScrollable = Math.max(1, editor.scrollHeight - editor.clientHeight);
      const previewScrollable = Math.max(0, preview.scrollHeight - preview.clientHeight);
      const ratio = editor.scrollTop / editorScrollable;
      preview.scrollTop = ratio * previewScrollable;
    } else {
      const previewScrollable = Math.max(1, preview.scrollHeight - preview.clientHeight);
      const editorScrollable = Math.max(0, editor.scrollHeight - editor.clientHeight);
      const ratio = preview.scrollTop / previewScrollable;
      editor.scrollTop = ratio * editorScrollable;
    }

    window.requestAnimationFrame(() => {
      syncingScrollRef.current = "";
    });
  }

  function jumpToSection(lineNumber: number) {
    const editor = editorRef.current;
    if (!editor) return;

    const lines = content.split("\n");
    const targetLine = Math.max(0, Math.min(lineNumber, lines.length - 1));
    const selectionStart = lines.slice(0, targetLine).join("\n").length + (targetLine > 0 ? 1 : 0);
    editor.focus();
    editor.setSelectionRange(selectionStart, selectionStart);

    const lineHeight = 24;
    editor.scrollTop = Math.max(0, targetLine * lineHeight - lineHeight * 2);
    setCursorPosition(selectionStart);
    syncScrollPosition("editor");
  }

  function handleEditorScroll() {
    syncScrollPosition("editor");
  }

  function handlePreviewScroll() {
    if (focusMode) return;
    syncScrollPosition("preview");
  }

  function applySectionContent(nextContent: string, nextCursorPosition?: number) {
    handleManualContentChange(nextContent);
    window.setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const targetPosition = typeof nextCursorPosition === "number" ? nextCursorPosition : editor.selectionStart ?? 0;
      editor.focus();
      editor.setSelectionRange(targetPosition, targetPosition);
      setCursorPosition(targetPosition);
    }, 0);
  }

  async function copySection() {
    if (!activeSection) return;
    await navigator.clipboard.writeText(activeSection.text.trim());
    setMessageTone("success");
    setMessage(`Section "${activeSection.label}" berhasil disalin.`);
  }

  function duplicateSection() {
    if (!activeSection) return;
    const duplicateText = `${activeSection.text}\n\n${activeSection.text}`;
    const nextContent = `${content.slice(0, activeSection.start)}${duplicateText}${content.slice(activeSection.end)}`;
    applySectionContent(nextContent, activeSection.end + 2);
  }

  function moveSection(direction: -1 | 1) {
    if (!activeSection) return;
    const swapIndex = activeSectionIndex + direction;
    if (swapIndex < 0 || swapIndex >= sectionBlocks.length) return;

    const blocks = [...sectionBlocks];
    const [moved] = blocks.splice(activeSectionIndex, 1);
    blocks.splice(swapIndex, 0, moved);
    const nextContent = blocks.map((block) => block.text.trimEnd()).join("\n\n").trim();
    const nextBlocks = buildSectionBlocks(nextContent, extractSectionMarkers(nextContent));
    const nextActive = nextBlocks[Math.max(0, Math.min(swapIndex, nextBlocks.length - 1))];
    applySectionContent(nextContent, nextActive?.start ?? 0);
  }

  function cleanupSpacing() {
    const nextContent = content
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
    applySectionContent(nextContent, Math.min(cursorPosition, nextContent.length));
  }

  return {
    changeJenis,
    handleManualContentChange,
    updateCursorPosition,
    jumpToSection,
    handleEditorScroll,
    handlePreviewScroll,
    applySectionContent,
    copySection,
    duplicateSection,
    moveSection,
    cleanupSpacing
  };
}
