import type { QualityCheck, QualityMetric, QualityReport } from "../db/schema";
import {
  hasContextLeak,
  hasUndiacritizedArabicInCriticalSections,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  type PromptDalilContext,
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

function normalizeReference(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function contentContainsReference(content: string, reference: string) {
  const normalizedContent = normalizeReference(content);
  const normalizedReference = normalizeReference(reference);
  if (!normalizedReference) return true;
  return normalizedContent.includes(normalizedReference);
}

function extractedQuranReferences(content: string) {
  return [...content.matchAll(/QS\.\s*[^:\n]{2,40}:\s*\d+(?:\s*-\s*\d+)?/gi)].map((match) => match[0].replace(/\s+/g, " ").trim());
}

function extractedHadithReferences(content: string) {
  return [...content.matchAll(/HR\.\s*[^.\n;،]+/gi)].map((match) => match[0].replace(/\s+/g, " ").trim());
}

function normalizeArabic(value: string) {
  return value.replace(/[\u064B-\u065F\u0670]/g, "").replace(/[^\u0600-\u06FF]+/g, "");
}

function arabicSnippetMatches(content: string, arab?: string) {
  if (!arab) return true;
  const normalizedExpected = normalizeArabic(arab);
  if (normalizedExpected.length < 12) return true;
  const normalizedContent = normalizeArabic(content);
  const snippetLength = Math.min(32, Math.max(12, Math.floor(normalizedExpected.length * 0.35)));
  return normalizedContent.includes(normalizedExpected.slice(0, snippetLength));
}

const dalilStopwords = new Set([
  "agar",
  "akan",
  "atau",
  "bahwa",
  "dalam",
  "dengan",
  "hendak",
  "hendaklah",
  "karena",
  "kepada",
  "maka",
  "orang",
  "pada",
  "siapa",
  "tidak",
  "untuk",
  "yang"
]);

function meaningTokens(value: string) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 5 && !dalilStopwords.has(token))
    )
  ];
}

function meaningOverlapIsEnough(content: string, translation: string) {
  const tokens = meaningTokens(translation).slice(0, 12);
  if (tokens.length === 0) return true;
  const normalizedContent = meaningTokens(content).join(" ");
  const matched = tokens.filter((token) => normalizedContent.includes(token)).length;
  return matched >= Math.min(3, Math.max(1, Math.ceil(tokens.length * 0.3)));
}

function gradeNeedsDisplay(grade?: string) {
  if (!grade) return false;
  return !/perlu cek|tidak diketahui|unknown/i.test(grade);
}

function metric(id: string, label: string, checks: QualityCheck[]): QualityMetric {
  const relevant = checks.filter((item) => item.id === id || item.id.startsWith(`${id}_`));
  return metricFromChecks(id, label, relevant);
}

function metricFromChecks(id: string, label: string, relevant: QualityCheck[]): QualityMetric {
  if (relevant.length === 0) return { id, label, score: 100, detail: "Tidak ada isu terdeteksi." };
  return {
    id,
    label,
    score: scoreFromChecks(relevant),
    detail: relevant
      .filter((item) => !item.passed)
      .map((item) => item.label)
      .join(", ") || "Semua cek bagian ini lolos."
  };
}

function dalilValidationChecks(content: string, dalilContext?: PromptDalilContext): QualityCheck[] {
  if (!dalilContext) return [];

  const expectedItems = [...dalilContext.quran, ...dalilContext.hadith].filter((item) => item.reference);
  const missingReferences = expectedItems.filter((item) => !contentContainsReference(content, item.reference)).map((item) => item.reference);
  const expectedQuranReferences = new Set(dalilContext.quran.map((item) => normalizeReference(item.reference)));
  const expectedHadithReferences = new Set(dalilContext.hadith.map((item) => normalizeReference(item.reference)));
  const extraQuranReferences = extractedQuranReferences(content).filter((reference) => !expectedQuranReferences.has(normalizeReference(reference)));
  const extraHadithReferences = extractedHadithReferences(content).filter((reference) => !expectedHadithReferences.has(normalizeReference(reference)));
  const quranArabicMismatches = dalilContext.quran.filter((item) => !arabicSnippetMatches(content, item.arab)).map((item) => item.reference);
  const hadithMeaningMismatches = dalilContext.hadith
    .filter((item) => !meaningOverlapIsEnough(content, item.translation))
    .map((item) => item.reference);
  const missingGrades = dalilContext.hadith
    .filter((item) => gradeNeedsDisplay(item.grade) && !contentContainsReference(content, item.grade ?? ""))
    .map((item) => `${item.reference} (${item.grade})`);

  return [
    check(
      "selected_dalil_references",
      "Referensi dalil terpilih",
      missingReferences.length === 0,
      missingReferences.length === 0
        ? "Semua referensi dalil hasil retrieval terdeteksi di naskah."
        : `Referensi hasil retrieval belum terdeteksi: ${missingReferences.join(", ")}.`,
      "critical"
    ),
    check(
      "unsupported_quran_references",
      "Ayat di luar retrieval",
      extraQuranReferences.length === 0,
      extraQuranReferences.length === 0
        ? "Tidak ada rujukan ayat tambahan di luar dalil terpilih."
        : `Ada rujukan ayat di luar retrieval: ${extraQuranReferences.join(", ")}.`,
      "warning"
    ),
    check(
      "unsupported_hadith_references",
      "Hadits di luar retrieval",
      extraHadithReferences.length === 0,
      extraHadithReferences.length === 0
        ? "Tidak ada rujukan hadits tambahan di luar dalil terpilih."
        : `Ada rujukan hadits di luar retrieval: ${extraHadithReferences.join(", ")}.`,
      "warning"
    ),
    check(
      "quran_arabic_match",
      "Kecocokan teks ayat",
      quranArabicMismatches.length === 0,
      quranArabicMismatches.length === 0
        ? "Potongan teks Arab ayat sesuai dengan dalil terpilih."
        : `Teks Arab ayat perlu dicek untuk: ${quranArabicMismatches.join(", ")}.`,
      "critical"
    ),
    check(
      "hadith_meaning_overlap",
      "Makna hadits",
      hadithMeaningMismatches.length === 0,
      hadithMeaningMismatches.length === 0
        ? "Makna inti hadits masih terdeteksi di naskah."
        : `Makna hadits perlu dicek untuk: ${hadithMeaningMismatches.join(", ")}.`,
      "warning"
    ),
    check(
      "hadith_grade_display",
      "Derajat hadits",
      missingGrades.length === 0,
      missingGrades.length === 0
        ? "Derajat hadits tampil ketika tersedia."
        : `Derajat hadits belum tampil: ${missingGrades.join(", ")}.`,
      "warning"
    )
  ];
}

export function qualityReportFor(
  jenis: string,
  content: string,
  parameters: Record<string, unknown>,
  dalilContext?: PromptDalilContext
): QualityReport {
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
    ...dalilValidationChecks(content, dalilContext),
    check(
      "human_review",
      "Tinjauan dai",
      true,
      "Tetap periksa ulang dalil, terjemahan, dan kesesuaian jamaah sebelum disampaikan.",
      "info"
    )
  ];
  const score = scoreFromChecks(checks);
  const metrics = [
    metric("required", "Struktur", checks),
    metric("target", "Bahasa", checks),
    metricFromChecks("dalil", "Dalil", checks.filter((item) => item.id.includes("dalil") || item.id.includes("quran") || item.id.includes("hadith"))),
    metric("length", "Kelengkapan", checks),
    metric("context", "Konteks", checks)
  ];

  return {
    score,
    wordCount: count,
    reviewRequired: score < 85 || checks.some((item) => item.severity === "critical" && !item.passed),
    checks,
    metrics,
    generatedAt: new Date().toISOString()
  };
}
