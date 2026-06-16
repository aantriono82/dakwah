import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { IconCheckCircle, IconChevronDown, IconChevronUp, IconCopy, IconDocx, IconDownload, IconEye, IconFileDown, IconFileText, IconMaximize, IconMinimize, IconMoveDown, IconMoveUp, IconPdf, IconRotateCcw, IconSave, IconShield, IconSparkles, IconSync, IconTrash } from "../components/icons";
import { defaultParameters, FormKhutbah } from "../components/FormKhutbah";
import { JenisCard } from "../components/JenisCard";
import { NaskahPreview } from "../components/NaskahPreview";
import { QualityPanel } from "../components/QualityPanel";
import { Badge, Button, Card, Field, Input, Notice, Textarea } from "../components/ui";
import { completePageTransition } from "../lib/perf";
import { api, cn, downloadBlob, jenisOptions, type JenisId } from "../lib/utils";
import { validateGenerateParameters } from "../lib/validation";
import type { Naskah, QualityReport, Template } from "../types";

const defaultGenerateTimeoutMs = 120000;
const manualDraftStoragePrefix = "dakwah:generate-manual-draft:";
let generateConfigRequest: Promise<{ data: { generateClientTimeoutMs: number } }> | null = null;
const khutbahJenisIds: JenisId[] = ["khutbah-jumat", "idul-fitri", "idul-adha", "nikah"];
const jenisCategoryOrder = ["khutbah", "ceramah", "kultum"] as const;
type JenisCategoryId = (typeof jenisCategoryOrder)[number];
const jenisCategoryMeta: Record<JenisCategoryId, { label: string; description: string }> = {
  khutbah: {
    label: "Khutbah",
    description: "Jumat, Idul Fitri, Idul Adha, dan Nikah"
  },
  ceramah: {
    label: "Ceramah",
    description: "Ceramah umum dengan struktur yang lebih panjang"
  },
  kultum: {
    label: "Kultum",
    description: "Materi singkat 5-7 menit untuk pengantar atau penutup"
  }
};

function categoryForJenis(jenis: JenisId): JenisCategoryId {
  if (khutbahJenisIds.includes(jenis)) return "khutbah";
  return jenis === "ceramah" ? "ceramah" : "kultum";
}

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

export function Generate({
  initialJenis,
  allowedJenis = jenisOptions.map((item) => item.id),
  template,
  onTemplateApplied,
  onJenisChange
}: {
  initialJenis: JenisId;
  allowedJenis?: JenisId[];
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
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [generateTimeoutMs, setGenerateTimeoutMs] = useState(defaultGenerateTimeoutMs);
  const [savedNaskahId, setSavedNaskahId] = useState("");
  const [exporting, setExporting] = useState<"" | "pdf" | "docx">("");
  const [saving, setSaving] = useState(false);
  const [reviewingManual, setReviewingManual] = useState(false);
  const [manualEditDirty, setManualEditDirty] = useState(false);
  const [manualDraftStatus, setManualDraftStatus] = useState("");
  const [lastQuickFixDiff, setLastQuickFixDiff] = useState<{ fixId: "theme_focus" | "language_flow" | "dalil_alignment"; before: string; after: string } | null>(null);
  const [quickFixLoading, setQuickFixLoading] = useState<"" | "theme_focus" | "language_flow" | "dalil_alignment">("");
  const [sectionAiLoading, setSectionAiLoading] = useState<"" | "polish" | "shorten" | "dalil" | "closing">("");
  const [exportUrl, setExportUrl] = useState("");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const qualityPanelRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef<"" | "editor" | "preview">("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mobileParametersCollapsed, setMobileParametersCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [reviewBeforeGenerate, setReviewBeforeGenerate] = useState(true);
  const [generationStep, setGenerationStep] = useState<"input" | "review_outline" | "editor">("input");
  const [preparingProposal, setPreparingProposal] = useState(false);
  const [outlineProposal, setOutlineProposal] = useState<{ title: string; description: string }[]>([]);
  const [dalilProposal, setDalilProposal] = useState<{ quran: any[]; hadith: any[] }>({ quran: [], hadith: [] });
  const [selectedQuranRefs, setSelectedQuranRefs] = useState<string[]>([]);
  const [selectedHadithRefs, setSelectedHadithRefs] = useState<string[]>([]);
  const [expandedTafsir, setExpandedTafsir] = useState<Record<string, boolean>>({});

  async function prepareOutlineAndDalil() {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
      return;
    }

    setPreparingProposal(true);
    setMessage("");
    try {
      const data = await api<{ outline: { title: string; description: string }[]; dalilContext: { quran: any[]; hadith: any[] } }>("/api/generate/prepare", {
        method: "POST",
        body: JSON.stringify({ jenis, parameters })
      });
      setOutlineProposal(data.outline || []);
      setDalilProposal(data.dalilContext || { quran: [], hadith: [] });
      setSelectedQuranRefs((data.dalilContext?.quran || []).map((q: any) => q.reference));
      setSelectedHadithRefs((data.dalilContext?.hadith || []).map((h: any) => h.reference));
      setGenerationStep("review_outline");
      setMobileParametersCollapsed(true);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Gagal menyiapkan kerangka & dalil.");
    } finally {
      setPreparingProposal(false);
    }
  }

  function handleAddSection() {
    setOutlineProposal([...outlineProposal, { title: "Bagian Baru", description: "Tulis fokus bahasan di sini..." }]);
  }

  function handleRemoveSection(index: number) {
    setOutlineProposal(outlineProposal.filter((_, idx) => idx !== index));
  }

  function handleMoveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= outlineProposal.length) return;
    const nextOutline = [...outlineProposal];
    const temp = nextOutline[index];
    nextOutline[index] = nextOutline[nextIndex];
    nextOutline[nextIndex] = temp;
    setOutlineProposal(nextOutline);
  }

  function handleUpdateSection(index: number, field: "title" | "description", value: string) {
    const nextOutline = [...outlineProposal];
    nextOutline[index] = { ...nextOutline[index], [field]: value };
    setOutlineProposal(nextOutline);
  }

  function handleToggleQuran(ref: string) {
    setSelectedQuranRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  }

  function handleToggleHadith(ref: string) {
    setSelectedHadithRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  }

  function handleToggleTafsir(ref: string) {
    setExpandedTafsir((prev) => ({ ...prev, [ref]: !prev[ref] }));
  }

  function handleStartGeneration() {
    if (reviewBeforeGenerate) {
      prepareOutlineAndDalil();
    } else {
      setGenerationStep("editor");
      generate();
    }
  }

  async function handleFinalizeGeneration() {
    setGenerationStep("editor");
    const chosenQuran = dalilProposal.quran.filter((q) => selectedQuranRefs.includes(q.reference));
    const chosenHadith = dalilProposal.hadith.filter((h) => selectedHadithRefs.includes(h.reference));
    const selectedDalils = {
      quran: chosenQuran,
      hadith: chosenHadith
    };
    await generate(outlineProposal, selectedDalils);
  }

  useEffect(() => {
    completePageTransition("Generate");
  }, []);

  useEffect(() => {
    changeJenis(initialJenis);
  }, [initialJenis]);

  const manualDraftKey = useMemo(
    () => `${manualDraftStoragePrefix}${jenis}:${JSON.stringify(parameters)}`,
    [jenis, parameters]
  );

  useEffect(() => {
    if (!template) return;
    setJenis(template.jenis);
    setParameters({ ...defaultParameters(template.jenis), ...template.parameters });
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
    setMessageTone("success");
    setMessage(`Template "${template.name}" siap dipakai.`);
    onTemplateApplied();
  }, [onTemplateApplied, template]);

  useEffect(() => {
    (generateConfigRequest ??=
      api<{ data: { generateClientTimeoutMs: number } }>("/api/config").catch((error) => {
        generateConfigRequest = null;
        throw error;
      }))
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

  function changeJenis(next: JenisId) {
    setJenis(next);
    setParameters(defaultParameters(next));
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
    onJenisChange?.(next);
  }

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

  const selectedLabel = useMemo(() => jenisOptions.find((item) => item.id === jenis)?.label ?? "Naskah", [jenis]);
  const visibleJenisOptions = useMemo(() => jenisOptions.filter((item) => allowedJenis.includes(item.id)), [allowedJenis]);
  const activeCategory = useMemo(() => categoryForJenis(jenis), [jenis]);
  const visibleCategories = useMemo(() => {
    const categories = new Set(visibleJenisOptions.map((item) => categoryForJenis(item.id)));
    return jenisCategoryOrder.filter((category) => categories.has(category)).map((category) => ({
      id: category,
      ...jenisCategoryMeta[category]
    }));
  }, [visibleJenisOptions]);
  const categoryJenisOptions = useMemo(() => visibleJenisOptions.filter((item) => categoryForJenis(item.id) === activeCategory), [activeCategory, visibleJenisOptions]);
  const validationMessage = useMemo(() => validateGenerateParameters(jenis, parameters), [jenis, parameters]);
  const hasContent = content.trim().length > 0;
  const wordCount = hasContent ? content.trim().split(/\s+/).length : 0;
  const sectionMarkers = useMemo(() => extractSectionMarkers(content), [content]);
  const sectionBlocks = useMemo(() => buildSectionBlocks(content, sectionMarkers), [content, sectionMarkers]);
  const activeSectionIndex = useMemo(() => findActiveSectionIndex(content, sectionBlocks, cursorPosition), [content, sectionBlocks, cursorPosition]);
  const activeSection = activeSectionIndex >= 0 ? sectionBlocks[activeSectionIndex] : null;

  function makeTitle() {
    return `${selectedLabel}: ${parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan || "Tanpa Tema"}`;
  }

  async function generateWithoutStream(
    customOutline?: { title: string; description: string }[],
    customDalils?: { quran: any[]; hadith: any[] }
  ) {
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

  function quickFixInstruction(fixId: "theme_focus" | "language_flow" | "dalil_alignment") {
    if (fixId === "theme_focus") {
      return "Perkuat fokus tema. Buat isi utama lebih spesifik terhadap tema yang dipilih, kurangi nasihat yang terlalu umum, dan jelaskan kaitan dalil dengan realitas jamaah secara lebih langsung.";
    }
    if (fixId === "language_flow") {
      return "Perhalus bahasa naskah. Hilangkan kalimat yang terasa template atau generik, rapikan transisi, dan buat redaksi lebih natural untuk dibacakan.";
    }
    return "Rapikan penggunaan dalil. Pertahankan dalil yang ada, pastikan penjelasannya lebih akurat, relevan dengan tema, dan tidak terasa sekadar tempelan.";
  }

  async function applyQuickFix(fixId: "theme_focus" | "language_flow" | "dalil_alignment") {
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

  async function generate(
    customOutline?: { title: string; description: string }[],
    customDalils?: { quran: any[]; hadith: any[] }
  ) {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
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

  function updateCursorPosition() {
    const editor = editorRef.current;
    if (!editor) return;
    setCursorPosition(editor.selectionStart ?? 0);
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
    syncPreviewToEditor();
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

  function syncPreviewToEditor() {
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

  function scrollToPanel(ref: RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function sectionAiInstruction(action: "polish" | "shorten" | "dalil" | "closing") {
    if (!activeSection) return "";
    if (action === "polish") {
      return `Perhalus section "${activeSection.label}" saja. Buat bahasanya lebih natural, enak dibacakan, dan tetap setia pada makna aslinya. Jangan ubah section lain.`;
    }
    if (action === "shorten") {
      return `Pendekkan section "${activeSection.label}" saja sekitar 25-35% tanpa menghilangkan inti pesan. Pertahankan gaya dakwah yang ringkas dan jelas. Jangan ubah section lain.`;
    }
    if (action === "dalil") {
      return `Perkuat section "${activeSection.label}" saja dengan penjelasan dalil yang lebih tepat dan lebih nyambung ke tema. Jika belum ada dalil yang eksplisit, tambahkan rujukan yang singkat dan aman. Jangan ubah section lain.`;
    }
    return `Khusus untuk section "${activeSection.label}", buat penutup atau kalimat akhirnya lebih kuat, lebih mengajak, dan lebih layak dibacakan di akhir bagian. Jangan ubah section lain.`;
  }

  async function refineActiveSection(action: "polish" | "shorten" | "dalil" | "closing") {
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
          instruction: sectionAiInstruction(action),
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
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
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

  if (preparingProposal) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-border bg-background p-8 text-center shadow-sm max-w-2xl mx-auto my-12">
        <IconSync className="size-10 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">Menyiapkan Kerangka & Dalil...</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AI sedang menganalisis tema untuk menyusun kerangka dakwah terbaik dan mengumpulkan dalil yang paling relevan...
        </p>
      </div>
    );
  }

  if (generationStep === "review_outline") {
    return (
      <div className="mx-auto max-w-6xl w-full">
        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</div>
            <span className="text-sm font-medium text-muted-foreground">Parameter</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">2</div>
            <span className="text-sm font-semibold text-foreground">Tinjau Kerangka & Dalil</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground">3</div>
            <span className="text-sm font-medium text-muted-foreground">Penulisan Naskah</span>
          </div>
        </div>

        {/* Back Button */}
        <Button
          type="button"
          className="mb-4 bg-secondary text-secondary-foreground"
          onClick={() => setGenerationStep("input")}
        >
          &larr; Kembali ke Form Parameter
        </Button>

        {/* Two-Column Editor Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Column 1: Outline Editor */}
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-1">Kerangka Naskah (Outline)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sesuaikan urutan dan fokus bahasan tiap bagian naskah.
              </p>

              <div className="flex flex-col gap-3">
                {outlineProposal.map((section, idx) => (
                  <div key={idx} className="relative rounded-lg border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          className="size-7 p-0 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          onClick={() => handleMoveSection(idx, -1)}
                          disabled={idx === 0}
                          title="Naikkan"
                        >
                          <IconChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          className="size-7 p-0 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          onClick={() => handleMoveSection(idx, 1)}
                          disabled={idx === outlineProposal.length - 1}
                          title="Turunkan"
                        >
                          <IconChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          className="size-7 p-0 bg-red-50 text-red-600 hover:bg-red-100"
                          onClick={() => handleRemoveSection(idx)}
                          title="Hapus"
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateSection(idx, "title", e.target.value)}
                        placeholder="Nama Bagian (e.g. Pembahasan 1)"
                        className="font-semibold"
                      />
                      <Textarea
                        value={section.description}
                        onChange={(e) => handleUpdateSection(idx, "description", e.target.value)}
                        placeholder="Fokus pembahasan pada bagian ini..."
                        className="min-h-16 text-xs"
                      />
                    </div>
                  </div>
                ))}

                {outlineProposal.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Belum ada bagian kerangka. Silakan tambah bagian baru.
                  </p>
                )}

                <Button
                  type="button"
                  className="mt-2 w-full border border-dashed border-primary/40 bg-transparent text-primary hover:bg-primary/5"
                  onClick={handleAddSection}
                >
                  <svg className="mr-2 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Bagian Baru
                </Button>
              </div>
            </Card>
          </div>

          {/* Column 2: Dalil Selector */}
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-1">Rujukan Dalil Pilihan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pilih dalil yang ingin disisipkan dan pelajari tafsir/syarahnya.
              </p>

              {/* Quran Section */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Al-Qur'an (Ayat)
                </h4>
                <div className="flex flex-col gap-3">
                  {dalilProposal.quran.map((item, idx) => (
                    <div
                      key={item.reference || idx}
                      className={cn(
                        "rounded-lg border p-3 shadow-sm transition",
                        selectedQuranRefs.includes(item.reference)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="checkbox"
                          id={`quran-${idx}`}
                          checked={selectedQuranRefs.includes(item.reference)}
                          onChange={() => handleToggleQuran(item.reference)}
                          className="mt-1 rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
                        />
                        <label
                          htmlFor={`quran-${idx}`}
                          className="font-semibold text-sm cursor-pointer select-none"
                        >
                          {item.reference}
                        </label>
                      </div>

                      {item.arab && (
                        <p className="mb-2 text-right font-serif text-lg leading-loose text-emerald-800 dark:text-emerald-300 font-semibold pr-2 select-all">
                          {item.arab}
                        </p>
                      )}
                      <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                        {item.translation}
                      </p>

                      {item.tafsir && (
                        <div className="border-t border-border/60 pt-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            onClick={() => handleToggleTafsir(item.reference)}
                          >
                            <span>
                              {expandedTafsir[item.reference] ? "Sembunyikan Tafsir" : "Lihat Tafsir"}
                            </span>
                            <span className="text-[10px]">
                              {expandedTafsir[item.reference] ? "▲" : "▼"}
                            </span>
                          </button>
                          {expandedTafsir[item.reference] && (
                            <div className="mt-2 rounded bg-muted/50 p-2.5 text-xs text-muted-foreground border-l-2 border-emerald-500 italic leading-relaxed">
                              {item.tafsir}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {dalilProposal.quran.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Tidak ada ayat Al-Qur'an hasil retrieval.</p>
                  )}
                </div>
              </div>

              {/* Hadith Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  As-Sunnah (Hadits)
                </h4>
                <div className="flex flex-col gap-3">
                  {dalilProposal.hadith.map((item, idx) => (
                    <div
                      key={item.reference || idx}
                      className={cn(
                        "rounded-lg border p-3 shadow-sm transition",
                        selectedHadithRefs.includes(item.reference)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="checkbox"
                          id={`hadith-${idx}`}
                          checked={selectedHadithRefs.includes(item.reference)}
                          onChange={() => handleToggleHadith(item.reference)}
                          className="mt-1 rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={`hadith-${idx}`}
                            className="font-semibold text-sm cursor-pointer select-none"
                          >
                            {item.reference}
                          </label>
                          {item.grade && (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                item.grade.toLowerCase().includes("sahih") || item.grade.toLowerCase().includes("shahih")
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              )}
                            >
                              {item.grade}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.arab && (
                        <p className="mb-2 text-right font-serif text-lg leading-loose text-emerald-800 dark:text-emerald-300 font-semibold pr-2 select-all">
                          {item.arab}
                        </p>
                      )}
                      <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                        {item.translation}
                      </p>

                      {item.tafsir && (
                        <div className="border-t border-border/60 pt-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            onClick={() => handleToggleTafsir(item.reference)}
                          >
                            <span>
                              {expandedTafsir[item.reference] ? "Sembunyikan Hikmah/Syarah" : "Lihat Hikmah/Syarah"}
                            </span>
                            <span className="text-[10px]">
                              {expandedTafsir[item.reference] ? "▲" : "▼"}
                            </span>
                          </button>
                          {expandedTafsir[item.reference] && (
                            <div className="mt-2 rounded bg-muted/50 p-2.5 text-xs text-muted-foreground border-l-2 border-emerald-500 italic leading-relaxed">
                              {item.tafsir}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {dalilProposal.hadith.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Tidak ada hadits hasil retrieval.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{outlineProposal.length}</span> bagian kerangka |{" "}
            <span className="font-semibold text-foreground">
              {selectedQuranRefs.length + selectedHadithRefs.length}
            </span>{" "}
            dalil terpilih
          </div>
          <Button
            type="button"
            className="h-11 px-6 font-semibold"
            onClick={handleFinalizeGeneration}
            disabled={outlineProposal.length === 0}
          >
            Hasilkan Naskah Lengkap ✨
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", focusMode ? "2xl:grid-cols-1" : "2xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]")}>
      {hasContent && (
        <div className="sticky bottom-3 z-10 flex gap-2 rounded-lg border border-border bg-background/95 p-2 shadow-sm backdrop-blur sm:hidden">
          <Button type="button" className="flex-1 bg-secondary text-secondary-foreground" onClick={() => scrollToPanel(editorPanelRef)}>
            <IconFileText className="size-4" />
            Editor
          </Button>
          {!focusMode && (
            <Button type="button" className="flex-1 bg-secondary text-secondary-foreground" onClick={() => scrollToPanel(previewPanelRef)}>
              <IconEye className="size-4" />
              Preview
            </Button>
          )}
          <Button type="button" className="flex-1 bg-secondary text-secondary-foreground" onClick={() => scrollToPanel(qualityPanelRef)}>
            <IconShield className="size-4" />
            Quality
          </Button>
        </div>
      )}
      <section className={cn("grid gap-4", focusMode && "hidden")}>
        <div className="grid gap-3">
          <div>
            <h2 className="text-lg font-semibold">Jenis naskah</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih kategori, tentukan format, lalu isi parameter utama sebelum generate.</p>
          </div>
          <div className="grid gap-4">
            {visibleCategories.length > 1 && (
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-1">
                  {visibleCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={cn(
                        "flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-semibold transition",
                        activeCategory === category.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => {
                        const next = visibleJenisOptions.find((item) => categoryForJenis(item.id) === category.id);
                        if (next) changeJenis(next.id);
                      }}
                    >
                      <span className="text-sm font-semibold">{category.label}</span>
                    </button>
                  ))}
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {visibleCategories.find((category) => category.id === activeCategory)?.description}
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {categoryJenisOptions.map((item) => (
                <JenisCard key={item.id} item={item} active={jenis === item.id} onClick={changeJenis} />
              ))}
            </div>
          </div>
        </div>
        <Card className="p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Parameter {selectedLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Bahasa, standar editorial, durasi, dan konteks akan ikut dikirim ke AI.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{parameters.bahasa ?? "Indonesia"}</Badge>
              <Button
                type="button"
                className="h-8 px-2 sm:hidden bg-secondary text-secondary-foreground"
                onClick={() => setMobileParametersCollapsed((current) => !current)}
                aria-label={mobileParametersCollapsed ? "Buka parameter" : "Ciutkan parameter"}
              >
                {mobileParametersCollapsed ? <IconChevronDown className="size-4" /> : <IconChevronUp className="size-4" />}
              </Button>
            </div>
          </div>
          {mobileParametersCollapsed ? (
            <div className="grid gap-4 sm:hidden">
              <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ringkasan parameter</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{parameters.bahasa ?? "Indonesia"}</Badge>
                  {parameters.durasi && <Badge>{parameters.durasi}</Badge>}
                  {(parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan) && (
                    <Badge>{parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan}</Badge>
                  )}
                </div>
                <Button
                  type="button"
                  className="bg-secondary text-secondary-foreground"
                  onClick={() => setMobileParametersCollapsed(false)}
                >
                  <IconChevronDown className="size-4" />
                  Buka parameter
                </Button>
              </div>
              {validationMessage && <Notice tone="error">{validationMessage}</Notice>}
              <div className="mt-3 mb-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewBeforeGenerate}
                    onChange={(e) => setReviewBeforeGenerate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-4"
                  />
                  Tinjau kerangka &amp; dalil sebelum generate
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={handleStartGeneration} disabled={loading || saving || Boolean(exporting)}>
                  <IconSync className={cn("size-4", loading && "animate-spin")} />
                  {loading ? "Generating..." : reviewBeforeGenerate ? "Siapkan Kerangka" : "Generate"}
                </Button>
                <Button className="bg-secondary text-secondary-foreground" onClick={saveTemplate} disabled={loading || saving || Boolean(exporting)}>
                  <IconSave className="size-4" />
                  Template
                </Button>
              </div>
            </div>
          ) : (
            <>
              <FormKhutbah jenis={jenis} values={parameters} onChange={setParameters} />
              <Notice className="mt-4">
                Mode bawaan sekarang menekan akurasi isi, bahasa natural-jelas, dan dalil yang benar-benar sesuai dengan tema. Gunakan catatan editor bila Anda ingin membatasi gaya atau penekanan tertentu.
              </Notice>
              {validationMessage && <Notice tone="error" className="mt-4">{validationMessage}</Notice>}
              <div className="mt-4 mb-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewBeforeGenerate}
                    onChange={(e) => setReviewBeforeGenerate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary size-4"
                  />
                  Tinjau kerangka &amp; dalil sebelum generate
                </label>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Button onClick={handleStartGeneration} disabled={loading || saving || Boolean(exporting)}>
                  <IconSync className={cn("size-4", loading && "animate-spin")} />
                  {loading ? "Generating..." : reviewBeforeGenerate ? "Siapkan Kerangka" : "Generate"}
                </Button>
                <Button className="bg-secondary text-secondary-foreground" onClick={saveTemplate} disabled={loading || saving || Boolean(exporting)}>
                  <IconSave className="size-4" />
                  Template
                </Button>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="grid gap-4">
        <Card className="p-4">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <Field label="Judul naskah">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${selectedLabel}: tema`} />
            </Field>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-end">
              <Button onClick={save} disabled={!content || loading || saving || Boolean(exporting)}>
                <IconSave className="size-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button className="bg-muted text-foreground hover:bg-muted/80" onClick={() => exportFile("pdf")} disabled={!content || loading || saving || Boolean(exporting)}>
                <IconPdf className="size-4" />
                {exporting === "pdf" ? "PDF..." : "PDF"}
              </Button>
              <Button className="bg-muted text-foreground hover:bg-muted/80" onClick={() => exportFile("docx")} disabled={!content || loading || saving || Boolean(exporting)}>
                <IconDocx className="size-4" />
                {exporting === "docx" ? "DOCX..." : "DOCX"}
              </Button>
              <Button className="bg-secondary text-secondary-foreground" onClick={copyExportLink} disabled={!exportUrl || Boolean(exporting)}>
                <IconCopy className="size-4" />
                Copy link
              </Button>
            </div>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <Status label="Status" value={loading ? "Generating" : saving ? "Menyimpan" : exporting ? "Exporting" : savedNaskahId ? "Tersimpan" : hasContent ? "Belum disimpan" : "Siap"} />
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
                          <Button
                            type="button"
                            className="h-9 justify-start bg-secondary text-secondary-foreground"
                            onClick={copySection}
                            disabled={!activeSection}
                          >
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
                          <Button
                            type="button"
                            className="h-9 justify-start bg-secondary text-secondary-foreground"
                            onClick={duplicateSection}
                            disabled={!activeSection}
                          >
                            <IconSparkles className="size-4" />
                            Duplikat section
                          </Button>
                          <Button
                            type="button"
                            className="h-9 justify-start bg-secondary text-secondary-foreground"
                            onClick={cleanupSpacing}
                            disabled={!content.trim()}
                          >
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
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function QuickFixDiffPanel({
  fixId,
  before,
  after,
  onDismiss
}: {
  fixId: "theme_focus" | "language_flow" | "dalil_alignment";
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
  } satisfies Record<typeof fixId, string>;

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

function extractSectionMarkers(content: string): Array<{ label: string; line: number; preview: string }> {
  const lines = content.split("\n");
  const markers: Array<{ label: string; line: number; preview: string }> = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    const isMarker =
      [
        "pembuka",
        "pengantar",
        "dalil",
        "renungan",
        "pesan praktis",
        "poin-poin kunci",
        "poin-poin utama",
        "penutup",
        "khutbah pertama",
        "khutbah kedua",
        "doa penutup"
      ].includes(normalized) ||
      /^tema\s*:/i.test(trimmed) ||
      /^bahasa\s*:/i.test(trimmed);

    if (!isMarker || seen.has(normalized)) continue;
    seen.add(normalized);
    let preview = "";
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim();
      if (nextLine) {
        preview = nextLine;
        break;
      }
    }
    markers.push({ label: trimmed.replace(/:$/, ""), line: index, preview });
  }

  return markers;
}

function buildSectionBlocks(
  content: string,
  markers: Array<{ label: string; line: number; preview: string }>
): Array<{ label: string; line: number; preview: string; start: number; end: number; text: string }> {
  if (!content.trim() || markers.length === 0) return [];
  const lines = content.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  return markers.map((marker, index) => {
    const start = lineStarts[marker.line] ?? 0;
    const nextLine = markers[index + 1]?.line;
    const end = typeof nextLine === "number" ? Math.max(start, (lineStarts[nextLine] ?? content.length) - 1) : content.length;
    return {
      ...marker,
      start,
      end,
      text: content.slice(start, end).trim()
    };
  });
}

function findActiveSectionIndex(
  content: string,
  blocks: Array<{ start: number; end: number }>,
  cursorPosition: number
): number {
  if (!content.trim() || blocks.length === 0) return -1;
  const boundedCursor = Math.max(0, Math.min(cursorPosition, content.length));
  return blocks.findIndex((block) => boundedCursor >= block.start && boundedCursor <= block.end);
}
