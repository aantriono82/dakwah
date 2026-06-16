import type { QuickFixId } from "./generate-instructions";
import type { MessageTone, SectionAiAction } from "./generate-draft-types";
import type { SectionBlock } from "./generate-sections";
import type { QualityReport } from "../types";
import type { JenisId } from "./utils";
import { useGenerateContentActions } from "./useGenerateContentActions";
import { useGenerateStorageActions } from "./useGenerateStorageActions";

export function useGenerateNetworkActions({
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
}: {
  jenis: JenisId;
  parameters: Record<string, string>;
  content: string;
  title: string;
  savedNaskahId: string;
  selectedLabel: string;
  generateTimeoutMs: number;
  manualDraftKey: string;
  activeSection: SectionBlock | null;
  exportUrl: string;
  setTitle: (value: string) => void;
  setContent: (value: string | ((current: string) => string)) => void;
  setQuality: (value: QualityReport | null) => void;
  setLoading: (value: boolean) => void;
  setMessage: (value: string) => void;
  setMessageTone: (value: MessageTone) => void;
  setSavedNaskahId: (value: string) => void;
  setExportUrl: (value: string) => void;
  setManualEditDirty: (value: boolean) => void;
  setManualDraftStatus: (value: string) => void;
  setLastQuickFixDiff: (value: { fixId: QuickFixId; before: string; after: string } | null) => void;
  setQuickFixLoading: (value: "" | QuickFixId) => void;
  setSectionAiLoading: (value: SectionAiAction) => void;
  setReviewingManual: (value: boolean) => void;
  setSaving: (value: boolean) => void;
  setExporting: (value: "" | "pdf" | "docx") => void;
  setMobileParametersCollapsed: (value: boolean) => void;
  applySectionContent: (nextContent: string, nextCursorPosition?: number) => void;
}) {
  const contentActions = useGenerateContentActions({
    jenis,
    parameters,
    content,
    selectedLabel,
    generateTimeoutMs,
    manualDraftKey,
    activeSection,
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
    setMobileParametersCollapsed,
    applySectionContent
  });

  const storageActions = useGenerateStorageActions({
    jenis,
    parameters,
    content,
    title,
    savedNaskahId,
    exportUrl,
    manualDraftKey,
    setSavedNaskahId,
    setExportUrl,
    setManualDraftStatus,
    setManualEditDirty,
    setMessageTone,
    setMessage,
    setSaving,
    setExporting
  });

  return {
    ...contentActions,
    ...storageActions
  };
}
