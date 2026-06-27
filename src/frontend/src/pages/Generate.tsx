import { useEffect, useMemo, useState } from "react";
import { IconEye, IconFileText, IconShield } from "../components/icons";
import { defaultParameters } from "../components/FormKhutbah";
import { GenerateEditorPanel } from "../components/generate/GenerateEditorPanel";
import { GenerateSetupPanel } from "../components/generate/GenerateSetupPanel";
import { ReviewOutlineStep } from "../components/generate/ReviewOutlineStep";
import { Button } from "../components/ui";
import { categoryForJenis, jenisCategoryMeta, jenisCategoryOrder } from "../lib/generate-meta";
import { completePageTransition } from "../lib/perf";
import { useGenerateDraft } from "../lib/useGenerateDraft";
import { validateGenerateParameters } from "../lib/validation";
import { api, cn, jenisOptions, type JenisId } from "../lib/utils";
import type { Template } from "../types";

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
  const [reviewBeforeGenerate, setReviewBeforeGenerate] = useState(true);
  const [generationStep, setGenerationStep] = useState<"input" | "review_outline" | "editor">("input");
  const [preparingProposal, setPreparingProposal] = useState(false);
  const [outlineProposal, setOutlineProposal] = useState<{ title: string; description: string }[]>([]);
  const [dalilProposal, setDalilProposal] = useState<{ quran: any[]; hadith: any[] }>({ quran: [], hadith: [] });
  const [selectedQuranRefs, setSelectedQuranRefs] = useState<string[]>([]);
  const [selectedHadithRefs, setSelectedHadithRefs] = useState<string[]>([]);
  const [expandedTafsir, setExpandedTafsir] = useState<Record<string, boolean>>({});

  const {
    jenis,
    parameters,
    setParameters,
    content,
    title,
    setTitle,
    quality,
    loading,
    message,
    messageTone,
    setMessage,
    setMessageTone,
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
    availableModels,
    customModels,
    selectedModel,
    setSelectedModel,
    customModelDraft,
    setCustomModelDraft,
    addCustomModel,
    removeCustomModel,
    validationMessage,
    hasContent,
    wordCount,
    sectionMarkers,
    sectionBlocks,
    activeSectionIndex,
    activeSection,
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
    applyQuickFix,
    refineActiveSection,
    save,
    saveTemplate,
    exportFile,
    copyExportLink,
    scrollToPanel
  } = useGenerateDraft({
    initialJenis,
    template,
    onTemplateApplied,
    onJenisChange
  });

  async function prepareOutlineAndDalil() {
    const validationMessage = validateGenerateParameters(jenis, parameters);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
      return;
    }

    setPreparingProposal(true);
    setGenerationStep("review_outline");
    setMessage("");
    try {
      const data = await api<{ outline: { title: string; description: string }[]; dalilContext: { quran: any[]; hadith: any[] } }>("/api/generate/prepare", {
        method: "POST",
        body: JSON.stringify({ jenis, parameters, model: selectedModel || undefined })
      });
      setOutlineProposal(data.outline || []);
      setDalilProposal(data.dalilContext || { quran: [], hadith: [] });
      setSelectedQuranRefs((data.dalilContext?.quran || []).map((q: any) => q.reference));
      setSelectedHadithRefs((data.dalilContext?.hadith || []).map((h: any) => h.reference));
      setMobileParametersCollapsed(true);
    } catch (error) {
      setGenerationStep("input");
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
    const selectedDalils = {
      quran: chosenQuranDalils,
      hadith: chosenHadithDalils
    };
    await generate(outlineProposal, selectedDalils);
  }

  useEffect(() => {
    completePageTransition("Generate");
  }, []);

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
  const selectedQuranRefSet = useMemo(() => new Set(selectedQuranRefs), [selectedQuranRefs]);
  const selectedHadithRefSet = useMemo(() => new Set(selectedHadithRefs), [selectedHadithRefs]);
  const handleChangeJenis = (nextJenis: JenisId) => changeJenis(nextJenis, defaultParameters);
  const chosenQuranDalils = useMemo(
    () => dalilProposal.quran.filter((item) => selectedQuranRefSet.has(item.reference)),
    [dalilProposal.quran, selectedQuranRefSet]
  );
  const chosenHadithDalils = useMemo(
    () => dalilProposal.hadith.filter((item) => selectedHadithRefSet.has(item.reference)),
    [dalilProposal.hadith, selectedHadithRefSet]
  );
  const selectedDalilCount = selectedQuranRefs.length + selectedHadithRefs.length;


  if (generationStep === "review_outline") {
    return (
      <ReviewOutlineStep
        preparingProposal={preparingProposal}
        outlineProposal={outlineProposal}
        dalilProposal={dalilProposal}
        selectedQuranRefSet={selectedQuranRefSet}
        selectedHadithRefSet={selectedHadithRefSet}
        expandedTafsir={expandedTafsir}
        selectedDalilCount={selectedDalilCount}
        setGenerationStep={setGenerationStep}
        handleAddSection={handleAddSection}
        handleMoveSection={handleMoveSection}
        handleRemoveSection={handleRemoveSection}
        handleUpdateSection={handleUpdateSection}
        handleToggleQuran={handleToggleQuran}
        handleToggleHadith={handleToggleHadith}
        handleToggleTafsir={handleToggleTafsir}
        handleFinalizeGeneration={handleFinalizeGeneration}
      />
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
      <GenerateSetupPanel
        focusMode={focusMode}
        visibleCategories={visibleCategories}
        activeCategory={activeCategory}
        visibleJenisOptions={visibleJenisOptions}
        categoryJenisOptions={categoryJenisOptions}
        jenis={jenis}
        changeJenis={handleChangeJenis}
        selectedLabel={selectedLabel}
        availableModels={availableModels}
        customModels={customModels}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        customModelDraft={customModelDraft}
        setCustomModelDraft={setCustomModelDraft}
        addCustomModel={addCustomModel}
        removeCustomModel={removeCustomModel}
        parameters={parameters}
        setParameters={setParameters}
        mobileParametersCollapsed={mobileParametersCollapsed}
        setMobileParametersCollapsed={setMobileParametersCollapsed}
        validationMessage={validationMessage}
        reviewBeforeGenerate={reviewBeforeGenerate}
        setReviewBeforeGenerate={setReviewBeforeGenerate}
        handleStartGeneration={handleStartGeneration}
        saveTemplate={saveTemplate}
        loading={loading}
        saving={saving}
        exporting={exporting}
      />

      <GenerateEditorPanel
        title={title}
        setTitle={setTitle}
        selectedLabel={selectedLabel}
        save={save}
        loading={loading}
        saving={saving}
        exporting={exporting}
        exportFile={exportFile}
        copyExportLink={copyExportLink}
        savedNaskahId={savedNaskahId}
        exportUrl={exportUrl}
        message={message}
        messageTone={messageTone}
        hasContent={hasContent}
        editorPanelRef={editorPanelRef}
        previewPanelRef={previewPanelRef}
        qualityPanelRef={qualityPanelRef}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        reviewManualDraft={reviewManualDraft}
        reviewingManual={reviewingManual}
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
        manualEditDirty={manualEditDirty}
        manualDraftStatus={manualDraftStatus}
        quality={quality}
        applyQuickFix={applyQuickFix}
        quickFixLoading={quickFixLoading}
        lastQuickFixDiff={lastQuickFixDiff}
        setLastQuickFixDiff={setLastQuickFixDiff}
        wordCount={wordCount}
      />
    </div>
  );
}
