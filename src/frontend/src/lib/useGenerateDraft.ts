import { useMemo, useRef, useState, type RefObject } from "react";
import { defaultParameters } from "../components/FormKhutbah";
import { buildSectionBlocks, extractSectionMarkers, findActiveSectionIndex, type SectionBlock } from "./generate-sections";
import { type QuickFixId } from "./generate-instructions";
import { type SectionAiAction, type MessageTone } from "./generate-draft-types";
import { useGenerateEditorOperations } from "./useGenerateEditorOperations";
import { useGenerateNetworkActions } from "./useGenerateNetworkActions";
import { useGeneratePersistence } from "./useGeneratePersistence";
import { jenisOptions, type JenisId } from "./utils";
import type { QualityReport, Template } from "../types";

const defaultGenerateTimeoutMs = 120000;
const manualDraftStoragePrefix = "dakwah:generate-manual-draft:";

export function useGenerateDraft({
  initialJenis,
  template,
  onTemplateApplied,
  onJenisChange
}: {
  initialJenis: JenisId;
  template: Template | null;
  onTemplateApplied: () => void;
  onJenisChange?: (jenis: JenisId) => void;
}) {
  const [jenis, setJenis] = useState<JenisId>(initialJenis);
  const [parameters, setParameters] = useState(defaultParameters(initialJenis));
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");
  const [generateTimeoutMs, setGenerateTimeoutMs] = useState(defaultGenerateTimeoutMs);
  const [savedNaskahId, setSavedNaskahId] = useState("");
  const [exporting, setExporting] = useState<"" | "pdf" | "docx">("");
  const [saving, setSaving] = useState(false);
  const [reviewingManual, setReviewingManual] = useState(false);
  const [manualEditDirty, setManualEditDirty] = useState(false);
  const [manualDraftStatus, setManualDraftStatus] = useState("");
  const [lastQuickFixDiff, setLastQuickFixDiff] = useState<{ fixId: QuickFixId; before: string; after: string } | null>(null);
  const [quickFixLoading, setQuickFixLoading] = useState<"" | QuickFixId>("");
  const [sectionAiLoading, setSectionAiLoading] = useState<SectionAiAction>("");
  const [exportUrl, setExportUrl] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mobileParametersCollapsed, setMobileParametersCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const qualityPanelRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef<"" | "editor" | "preview">("");

  const manualDraftKey = useMemo(
    () => `${manualDraftStoragePrefix}${jenis}:${JSON.stringify(parameters)}`,
    [jenis, parameters]
  );

  const selectedLabel = useMemo(() => jenisOptions.find((item) => item.id === jenis)?.label ?? "Naskah", [jenis]);
  const validationMessage = useMemo(() => validateGenerateParameters(jenis, parameters), [jenis, parameters]);
  const hasContent = content.trim().length > 0;
  const wordCount = useMemo(() => (hasContent ? content.trim().split(/\s+/).length : 0), [content, hasContent]);
  const sectionMarkers = useMemo(() => extractSectionMarkers(content), [content]);
  const sectionBlocks = useMemo(() => buildSectionBlocks(content, sectionMarkers), [content, sectionMarkers]);
  const activeSectionIndex = useMemo(() => findActiveSectionIndex(content, sectionBlocks, cursorPosition), [content, sectionBlocks, cursorPosition]);
  const activeSection = activeSectionIndex >= 0 ? sectionBlocks[activeSectionIndex] : null;

  useGeneratePersistence({
    initialJenis,
    template,
    onTemplateApplied,
    onJenisChange,
    jenis,
    parameters,
    content,
    manualDraftKey,
    setJenis,
    setParameters,
    setContent,
    setQuality,
    setTitle,
    setGenerateTimeoutMs,
    setSavedNaskahId,
    setExportUrl,
    setManualEditDirty,
    setManualDraftStatus,
    setLastQuickFixDiff,
    setMobileParametersCollapsed,
    setFocusMode,
    setMessage,
    setMessageTone
  });

  const {
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
  } = useGenerateEditorOperations({
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
  });

  const {
    applyQuickFix,
    generate,
    reviewManualDraft,
    refineActiveSection,
    save,
    saveTemplate,
    exportFile,
    copyExportLink
  } = useGenerateNetworkActions({
    jenis,
    parameters,
    content,
    title,
    savedNaskahId,
    selectedLabel,
    generateTimeoutMs,
    manualDraftKey,
    activeSection,
    exportUrl,
    setTitle,
    setContent,
    setQuality,
    setLoading,
    setMessage,
    setMessageTone,
    setSavedNaskahId,
    setExportUrl,
    setManualEditDirty,
    setManualDraftStatus,
    setLastQuickFixDiff,
    setQuickFixLoading,
    setSectionAiLoading,
    setReviewingManual,
    setSaving,
    setExporting,
    setMobileParametersCollapsed,
    applySectionContent
  });

  function scrollToPanel(ref: RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return {
    jenis,
    setJenis,
    parameters,
    setParameters,
    content,
    title,
    setTitle,
    quality,
    loading,
    message,
    messageTone,
    savedNaskahId,
    exporting,
    saving,
    reviewingManual,
    manualEditDirty,
    manualDraftStatus,
    lastQuickFixDiff,
    setLastQuickFixDiff,
    quickFixLoading,
    sectionAiLoading,
    exportUrl,
    mobileParametersCollapsed,
    setMobileParametersCollapsed,
    focusMode,
    setFocusMode,
    editorRef,
    editorPanelRef,
    previewPanelRef,
    qualityPanelRef,
    previewViewportRef,
    selectedLabel,
    validationMessage,
    hasContent,
    wordCount,
    sectionMarkers,
    sectionBlocks,
    activeSectionIndex,
    activeSection: activeSection as SectionBlock | null,
    changeJenis,
    generate,
    handleManualContentChange,
    reviewManualDraft,
    updateCursorPosition,
    jumpToSection,
    handleEditorScroll,
    handlePreviewScroll,
    copySection,
    duplicateSection,
    moveSection,
    cleanupSpacing,
    refineActiveSection,
    save,
    saveTemplate,
    exportFile,
    copyExportLink,
    scrollToPanel
  };
}
