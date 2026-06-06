import type { QualityCheck, QualityReport } from "../db/schema";
import {
  hasContextLeak,
  hasUndiacritizedArabicInCriticalSections,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  wordCount
} from "./content";

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  severity: QualityCheck["severity"] = "warning"
): QualityCheck {
  return { id, label, passed, detail, severity };
}

function scoreFromChecks(checks: QualityCheck[]) {
  return Math.max(
    0,
    checks.reduce((score, item) => {
      if (item.passed || item.severity === "info") return score;
      return score - (item.severity === "critical" ? 25 : 12);
    }, 100)
  );
}

function hasDalilHeadings(text: string) {
  return /Allah\s+SWT\s+berfirman\s+dalam\s+AlQuran/i.test(text) && /Rasulullah\s+SAW\s+bersabda/i.test(text);
}

export function qualityReportFor(jenis: string, content: string, parameters: Record<string, unknown>): QualityReport {
  const count = wordCount(content);
  const minimum = minimumWordCountFor(jenis, parameters);
  const missingSections = missingRequiredArabicSections(jenis, content);
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  const checks: QualityCheck[] = [
    check(
      "length",
      "Panjang naskah",
      meetsMinimumLength(jenis, content, parameters),
      `Terhitung ${count.toLocaleString("id-ID")} kata; target minimal ${minimum.toLocaleString("id-ID")} kata.`,
      "warning"
    ),
    check(
      "required_sections",
      "Struktur wajib",
      missingSections.length === 0,
      missingSections.length === 0 ? "Bagian wajib terdeteksi." : `Perlu cek bagian: ${missingSections.join(", ")}.`,
      "critical"
    ),
    check(
      "target_language",
      "Bahasa target",
      matchesTargetLanguage(content, targetLanguage),
      `Target bahasa: ${targetLanguage}.`,
      "warning"
    ),
    check(
      "context_leak",
      "Kesesuaian konteks",
      !hasContextLeak(jenis, content),
      "Naskah tidak boleh memuat konteks jenis khutbah/ceramah lain.",
      "critical"
    ),
    check(
      "arabic_diacritics",
      "Harakat teks Arab",
      !hasUndiacritizedArabicInCriticalSections(content),
      "Bagian Arab penting perlu memakai harakat.",
      "warning"
    ),
    check(
      "dalil_headings",
      "Rujukan dalil",
      hasDalilHeadings(content),
      "Ayat dan hadits sebaiknya berada pada heading standar agar mudah ditinjau.",
      "warning"
    ),
    check(
      "human_review",
      "Tinjauan dai",
      true,
      "Tetap periksa ulang dalil, terjemahan, dan kesesuaian jamaah sebelum disampaikan.",
      "info"
    )
  ];
  const score = scoreFromChecks(checks);

  return {
    score,
    wordCount: count,
    reviewRequired: score < 85 || checks.some((item) => item.severity === "critical" && !item.passed),
    checks,
    generatedAt: new Date().toISOString()
  };
}
