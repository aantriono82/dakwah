import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown, IconChevronUp, IconSave, IconSync } from "../icons";
import { defaultParameters, FormKhutbah } from "../FormKhutbah";
import { JenisCard } from "../JenisCard";
import { Badge, Button, Card, Field, Input, Notice } from "../ui";
import { getPublicConfig } from "../../lib/public-config";
import { api, cn, jenisOptions, type JenisId } from "../../lib/utils";
import { Plus, X } from "lucide-react";

type OpenRouterModelEntry = {
  id: string;
  name: string;
  pricingLabel: "Gratis" | "Berbayar" | "Tidak diketahui";
  isFree: boolean;
};

type CategoryOption = {
  id: string;
  label: string;
  description: string;
};

type JenisOption = (typeof jenisOptions)[number];

export function GenerateSetupPanel({
  focusMode,
  visibleCategories,
  activeCategory,
  visibleJenisOptions,
  categoryJenisOptions,
  jenis,
  changeJenis,
  selectedLabel,
  availableModels,
  customModels,
  selectedModel,
  setSelectedModel,
  customModelDraft,
  setCustomModelDraft,
  addCustomModel,
  removeCustomModel,
  parameters,
  setParameters,
  mobileParametersCollapsed,
  setMobileParametersCollapsed,
  validationMessage,
  reviewBeforeGenerate,
  setReviewBeforeGenerate,
  handleStartGeneration,
  saveTemplate,
  loading,
  saving,
  exporting
}: {
  focusMode: boolean;
  visibleCategories: CategoryOption[];
  activeCategory: string;
  visibleJenisOptions: JenisOption[];
  categoryJenisOptions: JenisOption[];
  jenis: JenisId;
  changeJenis: (jenis: JenisId) => void;
  selectedLabel: string;
  availableModels: string[];
  customModels: string[];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  customModelDraft: string;
  setCustomModelDraft: (value: string) => void;
  addCustomModel: (value: string) => void;
  removeCustomModel: (value: string) => void;
  parameters: ReturnType<typeof defaultParameters>;
  setParameters: (value: ReturnType<typeof defaultParameters>) => void;
  mobileParametersCollapsed: boolean;
  setMobileParametersCollapsed: (value: boolean | ((current: boolean) => boolean)) => void;
  validationMessage: string;
  reviewBeforeGenerate: boolean;
  setReviewBeforeGenerate: (value: boolean) => void;
  handleStartGeneration: () => void;
  saveTemplate: () => void;
  loading: boolean;
  saving: boolean;
  exporting: "" | "pdf" | "docx";
}) {
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogModels, setCatalogModels] = useState<OpenRouterModelEntry[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);

  const filteredCatalogModels = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return catalogModels;
    return catalogModels.filter((model) => model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query));
  }, [catalogModels, catalogQuery]);

  const availableModelEntries = useMemo(
    () =>
      availableModels.map((modelId) => {
        const entry = catalogModels.find((item) => item.id === modelId);
        return (
          entry ?? {
            id: modelId,
            name: modelId,
            pricingLabel: "Tidak diketahui" as const,
            isFree: false
          }
        );
      }),
    [availableModels, catalogModels]
  );

  const selectedModelEntry = useMemo(
    () => availableModelEntries.find((model) => model.id === selectedModel),
    [availableModelEntries, selectedModel]
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!modelPickerRef.current) return;
      if (event.target instanceof Node && !modelPickerRef.current.contains(event.target)) {
        setModelPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  async function loadOpenRouterCatalog() {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const config = await getPublicConfig();
      const provider = String(config.data.aiProvider ?? "").trim().toLowerCase();
      const baseURL = String(config.data.aiBaseURL ?? "").trim();
      const isOpenRouter = provider === "openrouter" || /openrouter\.ai/i.test(baseURL);
      const nextModels = isOpenRouter
        ? Array.from(
            new Map(
              (((await fetch(`${baseURL || "https://openrouter.ai/api/v1"}/models`, {
                credentials: "omit",
                headers: { Accept: "application/json", "User-Agent": "dakwah-ai-model-picker/1.0" }
              }).then((response) => response.json())) as { data?: Array<{ id?: string; canonical_slug?: string; name?: string; pricing?: { prompt?: string; completion?: string } }> }).data ?? [])
                .map((model) => {
                  const id = model.id?.trim() || model.canonical_slug?.trim() || "";
                  const prompt = Number(model.pricing?.prompt ?? "0");
                  const completion = Number(model.pricing?.completion ?? "0");
                  const isFree = Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
                  return {
                    id,
                    name: model.name?.trim() || id,
                    pricingLabel: isFree ? "Gratis" : "Berbayar",
                    isFree
                  } satisfies OpenRouterModelEntry;
                })
                .filter((model) => model.id)
                .map((model) => [model.id, model] as const)
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name))
        : Array.from(
            new Map(
              (
                (await api<{ data: { models: OpenRouterModelEntry[] } }>("/api/ai/models")).data.models ?? []
              )
                .map((model) => ({
                  id: model.id.trim(),
                  name: model.name.trim() || model.id.trim(),
                  pricingLabel: model.pricingLabel,
                  isFree: model.isFree
                }))
                .filter((model) => model.id)
                .map((model) => [model.id, model] as const)
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
      setCatalogModels(nextModels);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Gagal memuat katalog OpenRouter.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    void loadOpenRouterCatalog();
  }, []);

  return (
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
                      const next = visibleJenisOptions.find((item) => item.id !== jenis && categoryJenisOptions.some((option) => option.id === item.id))
                        ?? visibleJenisOptions.find((item) => category.id === (item.id === "ceramah" ? "ceramah" : item.id === "kultum" ? "kultum" : "khutbah"));
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
          <div className="grid gap-3">
            {categoryJenisOptions.map((item) => (
              <JenisCard key={item.id} item={item} active={jenis === item.id} onClick={changeJenis} />
            ))}
          </div>
        </div>
      </div>
      <Card className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Parameter {selectedLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Bahasa, durasi, tema, dan konteks inti akan ikut dikirim ke AI. Pengaturan lanjutan tersedia di Advanced.</p>
          </div>
          <Button
            type="button"
            className="h-8 bg-secondary px-2 text-secondary-foreground sm:hidden"
            onClick={() => setMobileParametersCollapsed((current) => !current)}
            aria-label={mobileParametersCollapsed ? "Buka parameter" : "Ciutkan parameter"}
          >
            {mobileParametersCollapsed ? <IconChevronDown className="size-4" /> : <IconChevronUp className="size-4" />}
          </Button>
        </div>
        {mobileParametersCollapsed ? (
          <div className="grid gap-4 sm:hidden">
            <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ringkasan parameter</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{parameters.bahasa ?? "Indonesia"}</Badge>
                {selectedModel && (
                  <>
                    <Badge className="max-w-full truncate" title={selectedModel}>
                      {selectedModel}
                    </Badge>
                    {selectedModelEntry && (
                      <Badge
                        className={
                          selectedModelEntry.pricingLabel === "Gratis"
                            ? "bg-emerald-100 text-emerald-700"
                            : selectedModelEntry.pricingLabel === "Berbayar"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {selectedModelEntry.pricingLabel}
                      </Badge>
                    )}
                  </>
                )}
                {parameters.durasi && <Badge>{parameters.durasi}</Badge>}
                {(parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan) && (
                  <Badge>{parameters.temaUtama || parameters.tema || parameters.topik || parameters.topikSingkat || parameters.temaPesan}</Badge>
                )}
              </div>
              <Button type="button" className="bg-secondary text-secondary-foreground" onClick={() => setMobileParametersCollapsed(false)}>
                <IconChevronDown className="size-4" />
                Buka parameter
              </Button>
            </div>
            {validationMessage && <Notice tone="error">{validationMessage}</Notice>}
            <ReviewToggle reviewBeforeGenerate={reviewBeforeGenerate} setReviewBeforeGenerate={setReviewBeforeGenerate} />
            <SetupActions
              loading={loading}
              saving={saving}
              exporting={exporting}
              reviewBeforeGenerate={reviewBeforeGenerate}
              handleStartGeneration={handleStartGeneration}
              saveTemplate={saveTemplate}
            />
          </div>
        ) : (
          <>
            <FormKhutbah jenis={jenis} values={parameters} onChange={setParameters} />
            <div className="mt-4 grid gap-2">
              <Field label="Model AI">
                <div className="grid gap-2">
                  <div ref={modelPickerRef} className="relative">
                    <Button
                      type="button"
                      className="h-10 w-full justify-between bg-background text-left font-normal text-foreground"
                      onClick={() => setModelPickerOpen((current) => !current)}
                      disabled={availableModels.length === 0 || loading || saving || Boolean(exporting)}
                      aria-expanded={modelPickerOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">
                          {selectedModelEntry?.name || selectedModel || "Pilih model AI"}
                        </span>
                        {selectedModelEntry && (
                          <Badge
                            className={
                              selectedModelEntry.pricingLabel === "Gratis"
                                ? "bg-emerald-100 text-emerald-700"
                                : selectedModelEntry.pricingLabel === "Berbayar"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-muted text-muted-foreground"
                            }
                          >
                            {selectedModelEntry.pricingLabel}
                          </Badge>
                        )}
                      </span>
                      <IconChevronDown className="size-4 shrink-0 opacity-70" />
                    </Button>
                    {modelPickerOpen && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                        <div className="max-h-72 overflow-y-auto">
                          {availableModelEntries.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-muted-foreground">Memuat model...</p>
                          ) : (
                            availableModelEntries.map((model) => {
                              const active = model.id === selectedModel;
                              return (
                                <button
                                  key={model.id}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-accent hover:text-accent-foreground",
                                    active && "bg-accent text-accent-foreground"
                                  )}
                                  onClick={() => {
                                    setSelectedModel(model.id);
                                    setModelPickerOpen(false);
                                  }}
                                  role="option"
                                  aria-selected={active}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block min-w-0 truncate text-sm font-medium" title={model.name}>
                                      {model.name}
                                    </span>
                                    <span className="block min-w-0 truncate text-xs text-muted-foreground" title={model.id}>
                                      {model.id}
                                    </span>
                                  </span>
                                  <Badge
                                    className={cn(
                                      "shrink-0",
                                      model.pricingLabel === "Gratis"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : model.pricingLabel === "Berbayar"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-muted text-muted-foreground"
                                    )}
                                    title={model.pricingLabel}
                                    aria-label={model.pricingLabel}
                                  >
                                    {model.pricingLabel}
                                  </Badge>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={customModelDraft}
                      onChange={(event) => setCustomModelDraft(event.target.value)}
                      placeholder="Tambahkan model OpenRouter, mis. openai/gpt-4.1"
                      disabled={loading || saving || Boolean(exporting)}
                    />
                    <Button
                      type="button"
                      className="bg-secondary text-secondary-foreground"
                      onClick={() => addCustomModel(customModelDraft)}
                      disabled={loading || saving || Boolean(exporting) || !customModelDraft.trim()}
                    >
                      <Plus className="size-4" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">
                Pilihan ini dipakai saat generate outline dan naskah. Preferensi tersimpan di browser.
              </p>
              {customModels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customModels.map((model) => (
                    <Badge key={model} className="inline-flex h-auto max-w-full items-center gap-1.5 py-1 pr-1.5">
                      <span className="max-w-56 truncate" title={model}>
                        {model}
                      </span>
                      <button
                        type="button"
                        className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                        onClick={() => removeCustomModel(model)}
                        aria-label={`Hapus model ${model}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Katalog OpenRouter</p>
                  <Button
                    type="button"
                    className="h-8 bg-secondary px-3 text-secondary-foreground"
                    onClick={() => void loadOpenRouterCatalog()}
                    disabled={catalogLoading || loading || saving || Boolean(exporting)}
                  >
                    <IconSync className={cn("size-4", catalogLoading && "animate-spin")} />
                    {catalogLoading ? "Memuat..." : "Muat katalog"}
                  </Button>
                </div>
                <Input
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="Cari model, mis. qwen, claude, gemini"
                  disabled={catalogLoading || loading || saving || Boolean(exporting)}
                />
                {catalogError && <Notice tone="error">{catalogError}</Notice>}
                <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-background">
                  {filteredCatalogModels.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      {catalogLoading ? "Memuat katalog..." : "Tidak ada model yang cocok. Muat katalog OpenRouter untuk melihat daftar."}
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredCatalogModels.slice(0, 40).map((model) => (
                        <div key={model.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 truncate text-sm font-medium" title={model.name}>
                                {model.name}
                              </span>
                              <Badge
                                className={
                                  model.pricingLabel === "Gratis"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : model.pricingLabel === "Berbayar"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-muted text-muted-foreground"
                                }
                              >
                                {model.pricingLabel}
                              </Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground" title={model.id}>
                              {model.id}
                            </p>
                          </div>
                          <Button
                            type="button"
                            className="h-8 bg-secondary px-3 text-secondary-foreground"
                            onClick={() => addCustomModel(model.id)}
                            disabled={loading || saving || Boolean(exporting)}
                          >
                            Tambah
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Notice className="mt-4">
              Mode bawaan sekarang memakai baseline moderat: akurasi ketat, bahasa natural-jelas, dan dalil relevan. Buka Advanced hanya jika Anda memang perlu constraint tambahan.
            </Notice>
            {validationMessage && <Notice tone="error" className="mt-4">{validationMessage}</Notice>}
            <div className="mt-4">
              <ReviewToggle reviewBeforeGenerate={reviewBeforeGenerate} setReviewBeforeGenerate={setReviewBeforeGenerate} />
            </div>
            <div className="mt-2">
              <SetupActions
                loading={loading}
                saving={saving}
                exporting={exporting}
                reviewBeforeGenerate={reviewBeforeGenerate}
                handleStartGeneration={handleStartGeneration}
                saveTemplate={saveTemplate}
              />
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

function ReviewToggle({
  reviewBeforeGenerate,
  setReviewBeforeGenerate
}: {
  reviewBeforeGenerate: boolean;
  setReviewBeforeGenerate: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-muted-foreground">
      <input
        type="checkbox"
        checked={reviewBeforeGenerate}
        onChange={(event) => setReviewBeforeGenerate(event.target.checked)}
        className="size-4 rounded border-border text-primary focus:ring-primary"
      />
      Tinjau kerangka &amp; dalil sebelum generate
    </label>
  );
}

function SetupActions({
  loading,
  saving,
  exporting,
  reviewBeforeGenerate,
  handleStartGeneration,
  saveTemplate
}: {
  loading: boolean;
  saving: boolean;
  exporting: "" | "pdf" | "docx";
  reviewBeforeGenerate: boolean;
  handleStartGeneration: () => void;
  saveTemplate: () => void;
}) {
  return (
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
  );
}
