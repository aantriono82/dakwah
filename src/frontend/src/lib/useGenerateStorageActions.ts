import { api, downloadBlob, type JenisId } from "./utils";
import { validateGenerateParameters } from "./validation";
import type { MessageTone } from "./generate-draft-types";
import type { Naskah } from "../types";

export function useGenerateStorageActions({
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
}: {
  jenis: JenisId;
  parameters: Record<string, string>;
  content: string;
  title: string;
  savedNaskahId: string;
  exportUrl: string;
  manualDraftKey: string;
  setSavedNaskahId: (value: string) => void;
  setExportUrl: (value: string) => void;
  setManualDraftStatus: (value: string) => void;
  setManualEditDirty: (value: boolean) => void;
  setMessageTone: (value: MessageTone) => void;
  setMessage: (value: string) => void;
  setSaving: (value: boolean) => void;
  setExporting: (value: "" | "pdf" | "docx") => void;
}) {
  async function saveGeneratedNaskah() {
    if (!content.trim()) {
      throw new Error("Generate naskah terlebih dahulu.");
    }

    const data = await api<{ data: Naskah }>("/api/naskah", {
      method: "POST",
      body: JSON.stringify({ title, jenis, bahasa: parameters.bahasa, duration: parameters.durasi, parameters, content })
    });
    setSavedNaskahId(data.data.id);
    setExportUrl(data.data.fileUrl ?? "");
    return data.data;
  }

  async function save() {
    setSaving(true);
    try {
      await saveGeneratedNaskah();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(manualDraftKey);
      }
      setManualDraftStatus("");
      setManualEditDirty(false);
      setMessageTone("success");
      setMessage("Naskah berhasil disimpan.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan naskah.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    const nextValidationMessage = validateGenerateParameters(jenis, parameters);
    if (nextValidationMessage) {
      setMessageTone("error");
      setMessage(nextValidationMessage);
      return;
    }

    const name = window.prompt("Nama template");
    if (!name) return;
    await api("/api/templates", { method: "POST", body: JSON.stringify({ name, jenis, parameters }) });
    setMessageTone("success");
    setMessage("Template berhasil disimpan.");
  }

  async function exportFile(format: "pdf" | "docx") {
    setExporting(format);
    setMessage("");
    try {
      const exportId = savedNaskahId || (await saveGeneratedNaskah()).id;
      const response = await fetch(`/api/export/${exportId}/${format}`, { method: "POST", credentials: "include" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Export gagal.");
      }

      const storageUrl = response.headers.get("X-Storage-Url") ?? "";
      const blob = await response.blob();
      downloadBlob(blob, `${title || "naskah"}.${format}`);
      if (storageUrl) setExportUrl(storageUrl);
      setMessageTone("success");
      setMessage(storageUrl ? "Export selesai. File sudah diunduh dan link siap disalin." : "Export selesai. File sudah diunduh.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Export gagal.");
    } finally {
      setExporting("");
    }
  }

  async function copyExportLink() {
    if (!exportUrl) {
      setMessageTone("error");
      setMessage("Export naskah terlebih dahulu untuk membuat link.");
      return;
    }

    await navigator.clipboard.writeText(exportUrl);
    setMessageTone("success");
    setMessage("Link export berhasil disalin.");
  }

  return {
    save,
    saveTemplate,
    exportFile,
    copyExportLink
  };
}
