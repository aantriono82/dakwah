import { useEffect, useState } from "react";
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
        selectedModel?: string;
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
  selectedModel,
  customModels,
  setJenis,
  setParameters,
  setContent,
  setQuality,
  setTitle,
  setGenerateTimeoutMs,
  setAvailableModels,
  setCustomModels,
  setSelectedModel,
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
  selectedModel: string;
  customModels: string[];
  setJenis: (value: JenisId) => void;
  setParameters: (value: Record<string, string>) => void;
  setContent: (value: string) => void;
  setQuality: (value: QualityReport | null) => void;
  setTitle: (value: string) => void;
  setGenerateTimeoutMs: (value: number) => void;
  setAvailableModels: (value: string[]) => void;
  setCustomModels: (value: string[] | ((current: string[]) => string[])) => void;
  setSelectedModel: (value: string) => void;
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
  const [modelSelectionReady, setModelSelectionReady] = useState(false);
  const customModelStorageKey = "dakwah:generate-custom-models";

  async function loadPublicModels(baseURL?: string) {
    const normalizedBaseURL = baseURL?.trim().replace(/\/+$/, "");
    if (!normalizedBaseURL) return [];
    try {
      const response = await fetch(`${normalizedBaseURL}/models`, { credentials: "omit" });
      if (!response.ok) return [];
      const body = (await response.json()) as { data?: Array<{ id?: string; canonical_slug?: string }> };
      return Array.from(
        new Set(
          (body.data ?? [])
            .map((item) => item.id?.trim() || item.canonical_slug?.trim() || "")
            .filter(Boolean)
        )
      );
    } catch {
      return [];
    }
  }

  async function applyModelSelection(nextModels: string[], fallbackModel?: string, extraModels: string[] = []) {
    setAvailableModels(nextModels);
    const savedModel = typeof window !== "undefined" ? window.localStorage.getItem("dakwah:generate-model")?.trim() ?? "" : "";
    const candidate = savedModel || fallbackModel || "";
    const allowedModels = new Set([...nextModels, ...extraModels]);
    const nextModel = candidate && allowedModels.has(candidate) ? candidate : nextModels[0] ?? candidate;
    setSelectedModel(nextModel);
    setModelSelectionReady(true);
  }

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
    let storedCustomModels: string[] = [];
    if (typeof window !== "undefined") {
      const storedCustomModelsRaw = window.localStorage.getItem(customModelStorageKey);
      if (storedCustomModelsRaw) {
        try {
          const parsed = JSON.parse(storedCustomModelsRaw);
          if (Array.isArray(parsed)) {
            storedCustomModels = parsed.map((item) => String(item).trim()).filter(Boolean);
            setCustomModels(storedCustomModels);
          }
        } catch {
          // Ignore malformed cache.
        }
      }
    }

    getPublicConfig()
      .then(async (data) => {
        const clientTimeoutMs = Number(data.data.generateClientTimeoutMs);
        if (Number.isFinite(clientTimeoutMs)) {
          setGenerateTimeoutMs(clientTimeoutMs);
        }
        const configuredModels = (data.data.aiModels ?? []).map((item) => item.trim()).filter(Boolean);
        if (configuredModels.length > 0) {
          await applyModelSelection(configuredModels, data.data.aiModel?.trim() || undefined, storedCustomModels);
          return;
        }

        const baseURL = data.data.aiBaseURL?.trim();
        const provider = String(data.data.aiProvider ?? "").trim().toLowerCase();
        if (provider === "openrouter" || /openrouter\.ai/i.test(baseURL ?? "")) {
          const publicModels = await loadPublicModels(baseURL || "https://openrouter.ai/api/v1");
          if (publicModels.length > 0) {
            await applyModelSelection(publicModels, data.data.aiModel?.trim() || undefined, storedCustomModels);
            return;
          }
        }

        await applyModelSelection(configuredModels.length > 0 ? configuredModels : [data.data.aiModel?.trim() || ""].filter(Boolean), data.data.aiModel?.trim() || undefined, storedCustomModels);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const smokeApi = (window.__DAKWAH_UI_SMOKE__ ??= {});
    smokeApi.setGenerateDraft = ({
      jenis: nextJenis,
      parameters: nextParameters,
      title: nextTitle,
      content: nextContent,
      quality: nextQuality,
      selectedModel: nextSelectedModel
    }) => {
      setJenis(nextJenis);
      setParameters({ ...defaultParameters(nextJenis), ...nextParameters });
      setTitle(nextTitle);
      setContent(nextContent);
      setQuality(nextQuality);
      if (nextSelectedModel !== undefined) {
        setSelectedModel(nextSelectedModel);
      }
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

  useEffect(() => {
    if (!modelSelectionReady) return;
    if (typeof window === "undefined") return;
    if (!selectedModel) {
      window.localStorage.removeItem("dakwah:generate-model");
      return;
    }
    window.localStorage.setItem("dakwah:generate-model", selectedModel);
  }, [modelSelectionReady, selectedModel]);

  useEffect(() => {
    if (!modelSelectionReady) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(customModelStorageKey, JSON.stringify(customModels));
  }, [modelSelectionReady, customModels]);
}
