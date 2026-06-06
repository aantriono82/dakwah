import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { QualityCheck, QualityReport } from "../types";
import { Badge, Button } from "./ui";

function toneForSeverity(severity: QualityCheck["severity"]) {
  if (severity === "critical") return "border-destructive/25 bg-destructive/10";
  if (severity === "warning") return "border-amber-500/25 bg-amber-500/10";
  return "border-border bg-background";
}

function summarizeFindings(report: QualityReport) {
  const failed = report.checks.filter((check) => !check.passed);
  return {
    editorial: failed.filter((check) => check.id === "template_language" || check.id === "theme_focus_keywords"),
    dalil: failed.filter((check) => check.id.includes("dalil") || check.id.includes("quran") || check.id.includes("hadith")),
    bahasa: failed.filter((check) => check.id === "target_language" || check.id === "arabic_diacritics")
  };
}

type QuickFixId = "theme_focus" | "language_flow" | "dalil_alignment";

function quickFixesFor(report: QualityReport): Array<{ id: QuickFixId; label: string }> {
  const failed = report.checks.filter((check) => !check.passed);
  const fixes: Array<{ id: QuickFixId; label: string }> = [];

  if (failed.some((check) => check.id === "theme_focus_keywords")) {
    fixes.push({ id: "theme_focus", label: "Perbaiki fokus tema" });
  }
  if (failed.some((check) => check.id === "template_language" || check.id === "target_language")) {
    fixes.push({ id: "language_flow", label: "Perhalus bahasa" });
  }
  if (failed.some((check) => check.id.includes("dalil") || check.id.includes("quran") || check.id.includes("hadith"))) {
    fixes.push({ id: "dalil_alignment", label: "Rapikan dalil" });
  }

  return fixes;
}

export function QualityPanel({
  report,
  compact = false,
  onQuickFix,
  quickFixLoading
}: {
  report: QualityReport | null;
  compact?: boolean;
  onQuickFix?: (fixId: QuickFixId) => void;
  quickFixLoading?: QuickFixId | "";
}) {
  if (!report) return null;
  const failedChecks = report.checks.filter((check) => !check.passed);
  const findings = summarizeFindings(report);
  const quickFixes = onQuickFix ? quickFixesFor(report) : [];
  const summaryItems = [
    findings.editorial.length > 0 ? `Editorial ${findings.editorial.length}` : "",
    findings.dalil.length > 0 ? `Dalil ${findings.dalil.length}` : "",
    findings.bahasa.length > 0 ? `Bahasa ${findings.bahasa.length}` : ""
  ].filter(Boolean);

  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {report.reviewRequired ? <AlertTriangle className="size-4 text-amber-600" /> : <CheckCircle2 className="size-4 text-primary" />}
          <p className="text-sm font-medium">Quality guard</p>
        </div>
        <Badge>Skor {report.score}/100</Badge>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>{report.wordCount.toLocaleString("id-ID")} kata</p>
        <p>{report.reviewRequired ? "Perlu tinjauan khusus sebelum dipakai" : "Tetap tinjau dalil sebelum disampaikan"}</p>
      </div>
      {summaryItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summaryItems.map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
      )}
      {quickFixes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickFixes.map((fix) => (
            <Button
              key={fix.id}
              type="button"
              className="h-8 bg-secondary px-3 text-xs text-secondary-foreground"
              onClick={() => onQuickFix?.(fix.id)}
              disabled={Boolean(quickFixLoading)}
            >
              {quickFixLoading === fix.id ? `${fix.label}...` : fix.label}
            </Button>
          ))}
        </div>
      )}
      {report.metrics?.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {report.metrics.map((metric) => (
            <div key={metric.id} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{metric.label}</p>
                <Badge>{metric.score}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!compact && failedChecks.length > 0 && (
        <div className="grid gap-2">
          {failedChecks.map((check) => (
            <div key={check.id} className={`rounded-md border px-3 py-2 ${toneForSeverity(check.severity)}`}>
              <p className="text-xs font-semibold">{check.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
