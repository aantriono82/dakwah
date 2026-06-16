import { useEffect } from "react";
import { defaultParameters } from "../components/FormKhutbah";
import { getPublicConfig } from "./public-config";
import type { QuickFixId } from "./generate-instructions";
import type { JenisId } from "./utils";
import type { QualityReport, Template } from "../types";

declare global {
  interface Window {
    __DAKWAH_UI_SMOKE__?: {
      setGenerateDraft?: (payload: {
        jenis: JenisId;
        parameters: Record<string, string>;
        title: string;
        content: string;
        quality: QualityReport | null;
      }) => void;
    };
  }
}

export function resetGenerateDraftState({
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
  setMessageTone
}: {
  setContent: (value: string) => void;
  setQuality: (value: QualityReport | null) => void;
  setTitle: (value: string) => void;
  setSavedNaskahId: (value: string) => void;
  setExportUrl: (value: string) => void;
  setManualEditDirty: (value: boolean) => void;
  setManualDraftStatus: (value: string) => void;
  setLastQuickFixDiff: (value: { fixId: QuickFixId; before: string; after: string } | null) => void;
  setMobileParametersCollapsed: (value: boolean) => void;
  setFocusMode: (value: boolean) => void;
  setMessage: (value: string) => void;
  setMessageTone?: (value: "neutral" | "success" | "error") => void;
}) {
  setContent("");
  setQuality(null);
  setTitle("");
  setSavedNaskahId("");
  setExportUrl("");
  setManualEditDirty(false);
  setManualDraftStatus("");
  setLastQuickFixDiff(null);
  setMobileParametersCollapsed(false);
  setFocusMode(false);
  setMessage("");
  setMessageTone?.("neutral");
}

export function useGeneratePersistence({
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
}: {
  initialJenis: JenisId;
  template: Template | null;
  onTemplateApplied: () => void;
  onJenisChange?: (jenis: JenisId) => void;
  jenis: JenisId;
  parameters: Record<string, string>;
  content: string;
  manualDraftKey: string;
  setJenis: (value: JenisId) => void;
  setParameters: (value: Record<string, string>) => void;
  setContent: (value: string) => void;
  setQuality: (value: QualityReport | null) => void;
  setTitle: (value: string) => void;
  setGenerateTimeoutMs: (value: number) => void;
  setSavedNaskahId: (value: string) => void;
  setExportUrl: (value: string) => void;
  setManualEditDirty: (value: boolean) => void;
  setManualDraftStatus: (value: string) => void;
  setLastQuickFixDiff: (value: { fixId: QuickFixId; before: string; after: string } | null) => void;
  setMobileParametersCollapsed: (value: boolean) => void;
  setFocusMode: (value: boolean) => void;
  setMessage: (value: string) => void;
  setMessageTone: (value: "neutral" | "success" | "error") => void;
}) {
  useEffect(() => {
    if (jenis === initialJenis) return;
    setJenis(initialJenis);
    setParameters(defaultParameters(initialJenis));
    resetGenerateDraftState({
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
      setMessage
    });
    onJenisChange?.(initialJenis);
  }, [initialJenis]);

  useEffect(() => {
    if (!template) return;
    setJenis(template.jenis);
    setParameters({ ...defaultParameters(template.jenis), ...template.parameters });
    resetGenerateDraftState({
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
      setMessage
    });
    setMessageTone("success");
    setMessage(`Template "${template.name}" siap dipakai.`);
    onTemplateApplied();
  }, [onTemplateApplied, template]);

  useEffect(() => {
    getPublicConfig()
      .then((data) => {
        if (Number.isFinite(data.data.generateClientTimeoutMs)) {
          setGenerateTimeoutMs(data.data.generateClientTimeoutMs);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const smokeApi = (window.__DAKWAH_UI_SMOKE__ ??= {});
    smokeApi.setGenerateDraft = ({ jenis: nextJenis, parameters: nextParameters, title: nextTitle, content: nextContent, quality: nextQuality }) => {
      setJenis(nextJenis);
      setParameters({ ...defaultParameters(nextJenis), ...nextParameters });
      setTitle(nextTitle);
      setContent(nextContent);
      setQuality(nextQuality);
      setSavedNaskahId("");
      setExportUrl("");
      setManualEditDirty(false);
      setManualDraftStatus("");
      setLastQuickFixDiff(null);
      setMobileParametersCollapsed(false);
      setFocusMode(false);
      setMessage("");
      setMessageTone("neutral");
    };

    return () => {
      if (window.__DAKWAH_UI_SMOKE__) {
        delete window.__DAKWAH_UI_SMOKE__.setGenerateDraft;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDraft = window.localStorage.getItem(manualDraftKey);
    if (!savedDraft) {
      setManualDraftStatus("");
      return;
    }

    if (savedDraft === content) {
      setManualDraftStatus("Draft lokal tersimpan.");
      return;
    }

    setContent(savedDraft);
    setSavedNaskahId("");
    setExportUrl("");
    setManualEditDirty(true);
    setManualDraftStatus("Draft lokal dipulihkan.");
    setMessage("");
    setMessageTone("neutral");
  }, [manualDraftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!content.trim()) {
      window.localStorage.removeItem(manualDraftKey);
      setManualDraftStatus("");
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(manualDraftKey, content);
      setManualDraftStatus("Draft lokal tersimpan.");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [content, manualDraftKey]);
}
