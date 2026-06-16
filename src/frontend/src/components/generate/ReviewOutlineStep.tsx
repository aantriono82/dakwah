import { IconChevronDown, IconChevronUp, IconSync, IconTrash } from "../icons";
import { Button, Card } from "../ui";
import { cn } from "../../lib/utils";

type OutlineSection = { title: string; description: string };

export function ReviewOutlineStep({
  preparingProposal,
  outlineProposal,
  dalilProposal,
  selectedQuranRefSet,
  selectedHadithRefSet,
  expandedTafsir,
  selectedDalilCount,
  setGenerationStep,
  handleAddSection,
  handleMoveSection,
  handleRemoveSection,
  handleUpdateSection,
  handleToggleQuran,
  handleToggleHadith,
  handleToggleTafsir,
  handleFinalizeGeneration
}: {
  preparingProposal: boolean;
  outlineProposal: OutlineSection[];
  dalilProposal: { quran: any[]; hadith: any[] };
  selectedQuranRefSet: Set<string>;
  selectedHadithRefSet: Set<string>;
  expandedTafsir: Record<string, boolean>;
  selectedDalilCount: number;
  setGenerationStep: (step: "input" | "review_outline" | "editor") => void;
  handleAddSection: () => void;
  handleMoveSection: (index: number, direction: -1 | 1) => void;
  handleRemoveSection: (index: number) => void;
  handleUpdateSection: (index: number, field: "title" | "description", value: string) => void;
  handleToggleQuran: (ref: string) => void;
  handleToggleHadith: (ref: string) => void;
  handleToggleTafsir: (ref: string) => void;
  handleFinalizeGeneration: () => void;
}) {
  if (preparingProposal) {
    return (
      <div className="mx-auto my-12 flex min-h-[400px] max-w-2xl flex-col items-center justify-center rounded-lg border border-border bg-background p-8 text-center shadow-sm">
        <IconSync className="size-10 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">Menyiapkan Kerangka & Dalil...</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AI sedang menganalisis tema untuk menyusun kerangka dakwah terbaik dan mengumpulkan dalil yang paling relevan...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-center gap-4 border-b border-border pb-4">
        <StepChip done label="Parameter" />
        <div className="h-px w-8 bg-border" />
        <StepChip active label="Tinjau Kerangka & Dalil" />
        <div className="h-px w-8 bg-border" />
        <StepChip label="Penulisan Naskah" />
      </div>

      <Button type="button" className="mb-4 bg-secondary text-secondary-foreground" onClick={() => setGenerationStep("input")}>
        &larr; Kembali ke Form Parameter
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="mb-1 text-lg font-semibold">Kerangka Naskah (Outline)</h3>
            <p className="mb-4 text-sm text-muted-foreground">Sesuaikan urutan dan fokus bahasan tiap bagian naskah.</p>

            <div className="flex flex-col gap-3">
              {outlineProposal.map((section, idx) => (
                <div key={idx} className="relative rounded-lg border border-border bg-card p-3 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button type="button" className="size-7 bg-secondary p-0 text-secondary-foreground hover:bg-secondary/80" onClick={() => handleMoveSection(idx, -1)} disabled={idx === 0} title="Naikkan">
                        <IconChevronUp className="size-4" />
                      </Button>
                      <Button type="button" className="size-7 bg-secondary p-0 text-secondary-foreground hover:bg-secondary/80" onClick={() => handleMoveSection(idx, 1)} disabled={idx === outlineProposal.length - 1} title="Turunkan">
                        <IconChevronDown className="size-4" />
                      </Button>
                      <Button type="button" className="size-7 bg-red-50 p-0 text-red-600 hover:bg-red-100" onClick={() => handleRemoveSection(idx)} title="Hapus">
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) => handleUpdateSection(idx, "title", event.target.value)}
                      placeholder="Nama Bagian (e.g. Pembahasan 1)"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
                    />
                    <textarea
                      value={section.description}
                      onChange={(event) => handleUpdateSection(idx, "description", event.target.value)}
                      placeholder="Fokus pembahasan pada bagian ini..."
                      className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              ))}

              {outlineProposal.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Belum ada bagian kerangka. Silakan tambah bagian baru.</p>
              )}

              <Button type="button" className="mt-2 w-full border border-dashed border-primary/40 bg-transparent text-primary hover:bg-primary/5" onClick={handleAddSection}>
                <svg className="mr-2 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Bagian Baru
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="mb-1 text-lg font-semibold">Rujukan Dalil Pilihan</h3>
            <p className="mb-4 text-sm text-muted-foreground">Pilih dalil yang ingin disisipkan dan pelajari tafsir/syarahnya.</p>

            <DalilList
              title="Al-Qur'an (Ayat)"
              items={dalilProposal.quran}
              selectedRefSet={selectedQuranRefSet}
              expandedTafsir={expandedTafsir}
              onToggle={handleToggleQuran}
              onToggleTafsir={handleToggleTafsir}
              emptyLabel="Tidak ada ayat Al-Qur'an hasil retrieval."
              tafsirLabel={{ show: "Lihat Tafsir", hide: "Sembunyikan Tafsir" }}
            />

            <DalilList
              title="As-Sunnah (Hadits)"
              items={dalilProposal.hadith}
              selectedRefSet={selectedHadithRefSet}
              expandedTafsir={expandedTafsir}
              onToggle={handleToggleHadith}
              onToggleTafsir={handleToggleTafsir}
              emptyLabel="Tidak ada hadits hasil retrieval."
              tafsirLabel={{ show: "Lihat Hikmah/Syarah", hide: "Sembunyikan Hikmah/Syarah" }}
              showGrade
            />
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{outlineProposal.length}</span> bagian kerangka |{" "}
          <span className="font-semibold text-foreground">{selectedDalilCount}</span> dalil terpilih
        </div>
        <Button type="button" className="h-11 px-6 font-semibold" onClick={handleFinalizeGeneration} disabled={outlineProposal.length === 0}>
          Hasilkan Naskah Lengkap ✨
        </Button>
      </div>
    </div>
  );
}

function DalilList({
  title,
  items,
  selectedRefSet,
  expandedTafsir,
  onToggle,
  onToggleTafsir,
  emptyLabel,
  tafsirLabel,
  showGrade = false
}: {
  title: string;
  items: any[];
  selectedRefSet: Set<string>;
  expandedTafsir: Record<string, boolean>;
  onToggle: (ref: string) => void;
  onToggleTafsir: (ref: string) => void;
  emptyLabel: string;
  tafsirLabel: { show: string; hide: string };
  showGrade?: boolean;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="flex flex-col gap-3">
        {items.map((item, idx) => (
          <div
            key={item.reference || idx}
            className={cn("rounded-lg border bg-card p-3 shadow-sm transition", selectedRefSet.has(item.reference) ? "border-primary bg-primary/5" : "border-border")}
          >
            <div className="mb-2 flex items-start gap-2">
              <input
                type="checkbox"
                id={`${title}-${idx}`}
                checked={selectedRefSet.has(item.reference)}
                onChange={() => onToggle(item.reference)}
                className="mt-1 size-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${title}-${idx}`} className="cursor-pointer select-none text-sm font-semibold">
                  {item.reference}
                </label>
                {showGrade && item.grade && (
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

            {item.arab && <p className="mb-2 select-all pr-2 text-right font-serif text-lg font-semibold leading-loose text-emerald-800 dark:text-emerald-300">{item.arab}</p>}
            <p className="mb-3 text-xs leading-relaxed text-foreground/80">{item.translation}</p>

            {item.tafsir && (
              <div className="border-t border-border/60 pt-2">
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" onClick={() => onToggleTafsir(item.reference)}>
                  <span>{expandedTafsir[item.reference] ? tafsirLabel.hide : tafsirLabel.show}</span>
                  <span className="text-[10px]">{expandedTafsir[item.reference] ? "▲" : "▼"}</span>
                </button>
                {expandedTafsir[item.reference] && (
                  <div className="mt-2 rounded border-l-2 border-emerald-500 bg-muted/50 p-2.5 text-xs italic leading-relaxed text-muted-foreground">
                    {item.tafsir}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && <p className="py-2 text-xs text-muted-foreground">{emptyLabel}</p>}
      </div>
    </div>
  );
}

function StepChip({ label, active = false, done = false }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex size-7 items-center justify-center rounded-full text-xs font-bold", active ? "bg-primary text-primary-foreground shadow-sm" : done ? "bg-primary/20 text-primary" : "border border-border text-muted-foreground")}>
        {done ? "1" : active ? "2" : "3"}
      </div>
      <span className={cn("text-sm", active ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>{label}</span>
    </div>
  );
}

