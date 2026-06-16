import { IconChevronDown, IconChevronUp, IconSave, IconSync } from "../icons";
import { defaultParameters, FormKhutbah } from "../FormKhutbah";
import { JenisCard } from "../JenisCard";
import { Badge, Button, Card, Notice } from "../ui";
import { cn, type JenisId } from "../../lib/utils";

type CategoryOption = {
  id: string;
  label: string;
  description: string;
};

type JenisOption = {
  id: JenisId;
  label: string;
  description: string;
  accent: string;
};

export function GenerateSetupPanel({
  focusMode,
  visibleCategories,
  activeCategory,
  visibleJenisOptions,
  categoryJenisOptions,
  jenis,
  changeJenis,
  selectedLabel,
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
            <p className="mt-1 text-sm text-muted-foreground">Bahasa, durasi, tema, dan konteks inti akan ikut dikirim ke AI. Pengaturan lanjutan tersedia di Advanced.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{parameters.bahasa ?? "Indonesia"}</Badge>
            <Button
              type="button"
              className="h-8 bg-secondary px-2 text-secondary-foreground sm:hidden"
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

