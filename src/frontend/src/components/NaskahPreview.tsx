import { FileText } from "lucide-react";
import { cn } from "../lib/utils";

const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const amiriSectionPattern = /(pembuka|pembukaan|doa pembuka|doa penutup|ayat|al-?qur'?an|hadits|hadis)/i;
const headingPattern = /^\s*(#{1,4}\s*)?(\*\*)?(khutbah|isi|penutup|poin|nasihat|jamaah|tema|output|catatan)\b/i;

export function NaskahPreview({ content, loading }: { content: string; loading: boolean }) {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
        <p className="text-sm font-medium">Pratinjau naskah</p>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{wordCount.toLocaleString("id-ID")} kata</span>
          <span>{charCount.toLocaleString("id-ID")} karakter</span>
        </div>
      </div>
      {content ? (
        <div className="max-h-[72vh] min-h-[520px] overflow-auto p-5">
          <PreviewContent content={content} />
        </div>
      ) : (
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 p-5 text-center text-muted-foreground">
          <FileText className="size-10" />
          <p className="max-w-sm text-sm">
            {loading ? "Naskah sedang dihasilkan dan akan tampil bertahap di sini." : "Isi parameter, lalu jalankan generate untuk melihat naskah."}
          </p>
        </div>
      )}
    </div>
  );
}

function PreviewContent({ content }: { content: string }) {
  let amiriSection = false;

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

        return (
          <div
            key={index}
            dir={hasArabic ? "rtl" : "auto"}
            className={cn(
              "whitespace-pre-wrap break-words",
              useAmiri && "font-amiri text-[1.05rem] leading-8",
              hasArabic && "my-2 text-right text-[1.28rem] leading-10",
              startsAmiriSection && "mt-3 font-bold",
              startsOtherHeading && "mt-3 font-semibold"
            )}
          >
            {line}
          </div>
        );
      })}
    </article>
  );
}
