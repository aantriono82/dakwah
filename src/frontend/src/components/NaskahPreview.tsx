import { useEffect, type RefObject, type UIEventHandler } from "react";
import { IconFileText } from "./icons";
import { ensureArabicFont } from "../lib/fonts";
import { cn } from "../lib/utils";

const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const amiriSectionPattern = /(pembuka|pembukaan|doa pembuka|doa penutup|ayat|al-?qur'?an|hadits|hadis)/i;
const headingPattern = /^\s*(#{1,4}\s*)?(\*\*)?(khutbah|isi|penutup|poin|nasihat|jamaah|tema|output|catatan)\b/i;

export function NaskahPreview({
  content,
  loading,
  activeSectionLabel,
  scrollViewportRef,
  onViewportScroll,
  viewportClassName
}: {
  content: string;
  loading: boolean;
  activeSectionLabel?: string;
  scrollViewportRef?: RefObject<HTMLDivElement>;
  onViewportScroll?: UIEventHandler<HTMLDivElement>;
  viewportClassName?: string;
}) {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  useEffect(() => {
    if (arabicPattern.test(content)) ensureArabicFont();
  }, [content]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Pratinjau naskah</p>
          {activeSectionLabel && (
            <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
              Section aktif: {activeSectionLabel}
            </span>
          )}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString("id-ID")} kata</span>
          <span>{charCount.toLocaleString("id-ID")} karakter</span>
        </div>
      </div>
      {content ? (
        <div
          ref={scrollViewportRef}
          onScroll={onViewportScroll}
          className={cn("min-h-[280px] max-h-[58vh] overflow-auto p-4 sm:min-h-[360px] sm:p-5 xl:min-h-[320px] xl:max-h-[44vh]", viewportClassName)}
        >
          <PreviewContent content={content} activeSectionLabel={activeSectionLabel} />
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-4 text-center text-muted-foreground sm:min-h-[360px] sm:p-5 xl:min-h-[320px]">
          <IconFileText className="size-10" />
          <p className="max-w-sm text-sm">
            {loading ? "Naskah sedang dihasilkan dan akan tampil bertahap di sini." : "Isi parameter, lalu jalankan generate untuk melihat naskah."}
          </p>
        </div>
      )}
    </div>
  );
}

function PreviewContent({ content, activeSectionLabel }: { content: string; activeSectionLabel?: string }) {
  let amiriSection = false;
  const normalizedActiveSection = normalizeSectionLabel(activeSectionLabel);

  return (
    <article className="max-w-none text-sm leading-7 text-foreground">
      {content.split("\n").map((line, index) => {
        const trimmed = line.trim();
        const hasArabic = arabicPattern.test(line);
        const startsAmiriSection = amiriSectionPattern.test(trimmed);
        const startsOtherHeading = headingPattern.test(trimmed) && !startsAmiriSection;

        if (startsAmiriSection) amiriSection = true;
        if (startsOtherHeading) amiriSection = false;
        if (!trimmed) {
          const spacer = <div key={index} className="h-3" />;
          if (amiriSection) amiriSection = false;
          return spacer;
        }

        const useAmiri = hasArabic || startsAmiriSection || amiriSection;
        const isActiveHeading = normalizedActiveSection.length > 0 && normalizeSectionLabel(trimmed) === normalizedActiveSection;

        return (
          <div
            key={index}
            dir={hasArabic ? "rtl" : "auto"}
            className={cn(
              "whitespace-pre-wrap break-words text-justify",
              useAmiri && "font-amiri text-[1.05rem] leading-8",
              hasArabic && "my-2 text-[1.28rem] leading-10 [text-align-last:right]",
              startsAmiriSection && "mt-3",
              startsOtherHeading && "mt-3",
              isActiveHeading && "rounded-md bg-primary/10 px-2 py-1 text-primary"
            )}
          >
            <span>{line}</span>
          </div>
        );
      })}
    </article>
  );
}

function normalizeSectionLabel(value?: string) {
  return (value ?? "").trim().replace(/:$/, "").toLowerCase();
}
