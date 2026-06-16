import { buildSectionAiInstruction, quickFixInstruction, type QuickFixId } from "./generate-instructions";
import { api, type JenisId } from "./utils";
import { validateGenerateParameters } from "./validation";
import type { MessageTone, SectionAiAction } from "./generate-draft-types";
import type { SectionBlock } from "./generate-sections";
import type { QualityReport } from "../types";

export function useGenerateContentActions({
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
}: {
  jenis: JenisId;
  parameters: Record<string, string>;
  content: string;
  selectedLabel: string;
  generateTimeoutMs: number;
  manualDraftKey: string;
  activeSection: SectionBlock | null;
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
  setMobileParametersCollapsed: (value: boolean) => void;
  applySectionContent: (nextContent: string, nextCursorPosition?: number) => void;
}) {
  function makeTitle() {
    return `${selectedLabel}: ${parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan || "Tanpa Tema"}`;
  }

  async function generateWithoutStream(customOutline?: { title: string; description: string }[], customDalils?: { quran: any[]; hadith: any[] }) {
    const data = await api<{ title: string; content: string; quality: QualityReport }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        jenis,
        parameters,
        outline: customOutline,
        selectedDalils: customDalils
      })
    });
    setTitle(data.title);
    setContent(data.content);
    setQuality(data.quality);
  }

  async function reviewGeneratedContent(nextContent: string) {
    if (!nextContent.trim()) {
      setQuality(null);
      return;
    }

    const data = await api<{ quality: QualityReport }>("/api/generate/review", {
      method: "POST",
      body: JSON.stringify({ jenis, parameters, content: nextContent })
    });
    setQuality(data.quality);
  }

  async function applyQuickFix(fixId: QuickFixId) {
    if (!content.trim()) {
      setMessageTone("error");
      setMessage("Generate naskah terlebih dahulu.");
      return;
    }

    setQuickFixLoading(fixId);
    setMessage("");
    try {
      const previousContent = content;
      const data = await api<{ content: string; quality: QualityReport }>("/api/generate/refine", {
        method: "POST",
        body: JSON.stringify({
          jenis,
          parameters,
          content,
          instruction: quickFixInstruction(fixId)
        })
      });
      setContent(data.content);
      setQuality(data.quality);
      setSavedNaskahId("");
      setExportUrl("");
      setManualEditDirty(false);
      setLastQuickFixDiff({ fixId, before: previousContent, after: data.content });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(manualDraftKey, data.content);
      }
      setManualDraftStatus("Draft lokal tersimpan.");
      setMessageTone("success");
      setMessage("Naskah berhasil diperbaiki.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Perbaikan naskah gagal.");
    } finally {
      setQuickFixLoading("");
    }
  }

  async function generate(customOutline?: { title: string; description: string }[], customDalils?: { quran: any[]; hadith: any[] }) {
    const nextValidationMessage = validateGenerateParameters(jenis, parameters);
    if (nextValidationMessage) {
      setMessageTone("error");
      setMessage(nextValidationMessage);
      return;
    }

    setLoading(true);
    setContent("");
    setQuality(null);
    setSavedNaskahId("");
    setExportUrl("");
    setManualEditDirty(false);
    setMessageTone("neutral");
    setMessage("");
    setTitle(makeTitle());
    setLastQuickFixDiff(null);
    const controller = new AbortController();
    let pendingChunk = "";
    let flushFrame = 0;
    const flushPendingChunk = () => {
      flushFrame = 0;
      if (!pendingChunk) return;
      const chunk = pendingChunk;
      pendingChunk = "";
      setContent((current) => current + chunk);
    };
    const waitingTimer = window.setTimeout(() => {
      setMessageTone("neutral");
      setMessage("Menunggu respons dari provider AI. Jika model pertama penuh, aplikasi akan mencoba model berikutnya...");
    }, 3000);
    const timeoutTimer = window.setTimeout(() => {
      controller.abort();
    }, generateTimeoutMs);

    try {
      const response = await fetch("/api/generate/stream", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis,
          parameters,
          outline: customOutline,
          selectedDalils: customDalils
        })
      });
      if (!response.ok || !response.body) throw new Error("Generate gagal.");
      const reader = response.body.getReader();
      let nextContent = "";
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        window.clearTimeout(waitingTimer);
        setMessage("");
        const chunk = decoder.decode(value, { stream: true });
        nextContent += chunk;
        pendingChunk += chunk;
        if (!flushFrame) {
          flushFrame = window.requestAnimationFrame(flushPendingChunk);
        }
      }
      const remainder = decoder.decode();
      if (remainder) {
        nextContent += remainder;
        pendingChunk += remainder;
      }
      if (flushFrame) {
        window.cancelAnimationFrame(flushFrame);
      }
      if (pendingChunk) {
        flushPendingChunk();
      }
      await reviewGeneratedContent(nextContent);
      setManualEditDirty(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(manualDraftKey, nextContent);
      }
      setManualDraftStatus("Draft lokal tersimpan.");
      setMobileParametersCollapsed(true);
    } catch (error) {
      window.clearTimeout(waitingTimer);
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (isAbort) {
        setMessageTone("error");
        setMessage("Generate terlalu lama. Coba ulangi, kurangi durasi, atau ganti daftar model.");
      } else {
        setMessageTone("neutral");
        setMessage("Koneksi streaming gagal. Mencoba mode kompatibilitas...");
        try {
          await generateWithoutStream(customOutline, customDalils);
          setMobileParametersCollapsed(true);
          setMessageTone("success");
          setMessage("");
        } catch (fallbackError) {
          setMessageTone("error");
          setMessage(fallbackError instanceof Error ? fallbackError.message : "Generate gagal.");
        }
      }
    } finally {
      window.clearTimeout(waitingTimer);
      window.clearTimeout(timeoutTimer);
      if (flushFrame) {
        window.cancelAnimationFrame(flushFrame);
      }
      setLoading(false);
    }
  }

  async function reviewManualDraft() {
    if (!content.trim()) {
      setMessageTone("error");
      setMessage("Generate naskah terlebih dahulu.");
      return;
    }

    setReviewingManual(true);
    setMessage("");
    try {
      await reviewGeneratedContent(content);
      setManualEditDirty(false);
      setManualDraftStatus("Draft lokal tersimpan.");
      setMessageTone("success");
      setMessage("Penilaian kualitas diperbarui setelah edit manual.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Gagal meninjau ulang naskah.");
    } finally {
      setReviewingManual(false);
    }
  }

  async function refineActiveSection(action: Exclude<SectionAiAction, "">) {
    if (!activeSection) return;

    setSectionAiLoading(action);
    setMessage("");
    try {
      const data = await api<{ content: string; quality: QualityReport }>("/api/generate/refine", {
        method: "POST",
        body: JSON.stringify({
          jenis,
          parameters,
          content,
          instruction: buildSectionAiInstruction(activeSection, action),
          targetSection: activeSection.label
        })
      });

      applySectionContent(data.content, activeSection.start);
      setQuality(data.quality);
      setManualEditDirty(false);
      setLastQuickFixDiff(null);
      setMessageTone("success");
      setMessage(`Section "${activeSection.label}" berhasil diperbarui dengan AI.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Perbaikan section gagal.");
    } finally {
      setSectionAiLoading("");
    }
  }

  return {
    applyQuickFix,
    generate,
    reviewManualDraft,
    refineActiveSection
  };
}
