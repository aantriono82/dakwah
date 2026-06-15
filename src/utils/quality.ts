import type { QualityCheck, QualityMetric, QualityReport } from "../db/schema";
import {
  hasContextLeak,
  hasUndiacritizedArabicInCriticalSections,
  matchesTargetLanguage,
  meetsMinimumLength,
  minimumWordCountFor,
  missingRequiredArabicSections,
  normalizeLanguage,
  topicFromParameters,
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

const templateLanguagePatterns = [
  /tema ini mengingatkan kita/gi,
  /pada kesempatan (?:kali ini|yang berbahagia) /gi,
  /hadirin (?:sekalian|yang dirahmati allah), tema/gi,
  /nasihat pertama/gi,
  /nasihat kedua/gi,
  /nasihat ketiga/gi
];

function templateLanguageHits(content: string) {
  return templateLanguagePatterns.flatMap((pattern) => content.match(pattern) ?? []);
}

function normalizeTopicText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const themeStopwords = new Set([
  "agar",
  "akan",
  "atau",
  "bagi",
  "dan",
  "dari",
  "dengan",
  "dalam",
  "demi",
  "itu",
  "karena",
  "kepada",
  "kita",
  "maka",
  "pada",
  "para",
  "saat",
  "sebagai",
  "serta",
  "tentang",
  "tema",
  "untuk",
  "yang"
]);

function themeKeywords(value: string) {
  return [
    ...new Set(
      normalizeTopicText(value)
        .split(/\s+/)
        .filter((token) => token.length >= 4 && !themeStopwords.has(token))
    )
  ];
}

function countKeywordMentions(content: string, keywords: string[]) {
  const normalizedContent = normalizeTopicText(content);
  return keywords.filter((keyword) => normalizedContent.includes(keyword)).length;
}

function themeDomainTerms(theme: string) {
  const normalizedTheme = normalizeTopicText(theme);
  if (/\b(muharram|muharam|asyura|ashura|tasua|hijriah|hijriyah)\b/.test(normalizedTheme)) {
    return {
      label: "Muharram/Asyura",
      terms: ["muharram", "puasa", "asyura", "tasua", "bulan haram", "at taubah", "hijriah"]
    };
  }

  const domains: Array<{ pattern: RegExp; label: string; terms: string[] }> = [
    { pattern: /\b(judi|maisir|maysir|slot|taruhan|betting|judol)\b/, label: "judi/maisir", terms: ["judi", "maisir", "taruhan", "slot", "setan", "khamar", "sedekah", "keluarga"] },
    { pattern: /\b(riba|bunga|paylater|pinjaman|utang|hutang)\b/, label: "riba/muamalah", terms: ["riba", "sedekah", "halal", "muamalah", "utang", "pinjaman", "laknat"] },
    { pattern: /\b(zina|pergaulan bebas|seks bebas|pacaran bebas|khalwat|ikhtilat|pornografi|syahwat)\b/, label: "penjagaan kehormatan", terms: ["zina", "pandangan", "kemaluan", "kehormatan", "khalwat", "syahwat", "mahram"] },
    { pattern: /\b(amanah|khianat|jujur|kejujuran|integritas|korupsi|janji)\b/, label: "amanah/kejujuran", terms: ["amanah", "khianat", "jujur", "adil", "janji", "munafik", "tanggung jawab"] },
    { pattern: /\b(sabar|musibah|ujian|cobaan|keteguhan)\b/, label: "sabar/ujian", terms: ["sabar", "shalat", "musibah", "ujian", "mukmin", "keteguhan", "pertolongan"] },
    { pattern: /\b(syukur|bersyukur|nikmat)\b/, label: "syukur/nikmat", terms: ["syukur", "nikmat", "bertambah", "terima kasih", "kufur"] },
    { pattern: /\b(sedekah|infak|infaq|berbagi|fakir|miskin)\b/, label: "sedekah/kepedulian", terms: ["sedekah", "infak", "berbagi", "tetangga", "fakir", "miskin", "kepedulian"] },
    { pattern: /\b(taubat|tobat|istighfar|ampunan|rahmat allah)\b/, label: "taubat/ampunan", terms: ["taubat", "ampunan", "rahmat", "putus asa", "istighfar", "dosa"] },
    { pattern: /\b(ikhlas|niat|riya|pamer|pamrih)\b/, label: "ikhlas/niat", terms: ["ikhlas", "niat", "riya", "amal", "wajah allah", "pamrih"] },
    { pattern: /\b(ilmu|belajar|menuntut ilmu|ngaji|guru)\b/, label: "ilmu/belajar", terms: ["ilmu", "belajar", "agama", "pemahaman", "mengetahui", "mengamalkan"] },
    { pattern: /\b(tawakal|bertawakal|ikhtiar|berserah|cemas)\b/, label: "tawakal/ikhtiar", terms: ["tawakal", "ikhtiar", "berserah", "rezeki", "mencukupkan", "burung"] },
    { pattern: /\b(istiqamah|konsisten|rutin|teguh)\b/, label: "istiqamah/konsistensi", terms: ["istiqamah", "konsisten", "teguh", "amal", "malaikat", "beriman"] },
    { pattern: /\b(kematian|mati|ajal|akhirat|kubur|hisab|kiamat)\b/, label: "kematian/akhirat", terms: ["mati", "kematian", "akhirat", "kubur", "kiamat", "ajal", "hisab"] },
    { pattern: /\b(waktu|umur|usia|kesempatan|lalai|masa muda)\b/, label: "waktu/umur", terms: ["waktu", "umur", "masa", "kesehatan", "luang", "rugi", "kesempatan"] },
    { pattern: /\b(anak|remaja|parenting|pengasuhan|keluarga|generasi)\b/, label: "pendidikan keluarga", terms: ["anak", "keluarga", "pemimpin", "tanggung jawab", "shalat", "generasi", "remaja"] },
    { pattern: /\b(ukhuwah|persaudaraan|persatuan|perpecahan|damai|ishlah)\b/, label: "ukhuwah/perdamaian", terms: ["saudara", "persaudaraan", "damai", "ishlah", "persatuan", "mukmin"] },
    { pattern: /\b(silaturahmi|silaturahim|rahim|keluarga|maaf|memaafkan)\b/, label: "silaturahmi/keluarga", terms: ["silaturahmi", "silaturahim", "rahim", "keluarga", "maaf", "memaafkan", "rezeki"] },
    { pattern: /\b(ghibah|gunjing|prasangka|suudzon|tajassus|aib|gosip|fitnah)\b/, label: "ghibah/prasangka", terms: ["ghibah", "prasangka", "tajassus", "aib", "gunjing", "saudara", "dosa"] },
    { pattern: /\b(akhlak|adab|lembut|kasih sayang|marah|emosi|pemaaf)\b/, label: "akhlak/kelembutan", terms: ["akhlak", "adab", "lembut", "kasih sayang", "marah", "pemaaf", "mulia"] },
    { pattern: /\b(dakwah|nasihat|hikmah|mauizhah|amar makruf|tabligh)\b/, label: "dakwah/hikmah", terms: ["dakwah", "hikmah", "nasihat", "baik", "sampaikan", "ayat", "menyeru"] },
    { pattern: /\b(quran|al quran|alquran|tilawah|tadabbur|tahsin|tahfidz)\b/, label: "Al-Quran/tilawah", terms: ["quran", "tilawah", "tadabbur", "belajar", "mengajarkan", "petunjuk"] },
    { pattern: /\b(masjid|mushalla|musala|jamaah|berjamaah|takmir)\b/, label: "masjid/jamaah", terms: ["masjid", "jamaah", "shalat", "memakmurkan", "zakat", "rumah allah"] },
    { pattern: /\b(bersih|kebersihan|thaharah|taharah|suci|wudhu|najis)\b/, label: "kebersihan/thaharah", terms: ["bersih", "suci", "thaharah", "wudhu", "najis", "taubat", "iman"] },
    { pattern: /\b(rasul|nabi|sunnah|sunah|shalawat|maulid|cinta nabi)\b/, label: "cinta Rasul/sunnah", terms: ["rasul", "nabi", "sunnah", "teladan", "shalawat", "cinta", "iman"] },
    { pattern: /\b(nikah|pernikahan|mempelai|sakinah|mawaddah|rahmah|rumah tangga|suami|istri)\b/, label: "pernikahan/rumah tangga", terms: ["nikah", "pernikahan", "sakinah", "mawaddah", "rahmah", "keluarga", "suami", "istri", "tenteram", "kasih sayang"] },
    { pattern: /\b(kurban|qurban|adha|haji|ibrahim|ismail|pengorbanan)\b/, label: "kurban/Idul Adha", terms: ["kurban", "adha", "haji", "ibrahim", "ismail", "takwa", "pengorbanan"] }
  ];

  return domains.find((domain) => domain.pattern.test(normalizedTheme)) ?? null;
}

function expectedDalilTermsForTheme(theme: string) {
  const domain = themeDomainTerms(theme);
  return [
    ...new Set([...(domain?.terms ?? []), ...themeKeywords(theme)].map(normalizeTopicText).filter((item) => item.length >= 4))
  ];
}

function dalilItemText(item: PromptDalilContext["quran"][number]) {
  return normalizeTopicText([item.reference, item.translation, item.tafsir].filter(Boolean).join(" "));
}

function dalilThemeAlignmentChecks(dalilContext?: PromptDalilContext): QualityCheck[] {
  if (!dalilContext) return [];

  const terms = expectedDalilTermsForTheme(dalilContext.theme);
  if (terms.length === 0) return [];

  const requiredMatches = Math.min(2, terms.length);
  const relevantItems = [...dalilContext.quran, ...dalilContext.hadith].filter((item) => item.reference);
  const mismatchedItems = relevantItems
    .filter((item) => {
      const text = dalilItemText(item);
      if (!text) return false;
      const matched = terms.filter((term) => text.includes(term)).length;
      return matched < requiredMatches && !terms.some((term) => term.length >= 6 && text.includes(term));
    })
    .map((item) => item.reference);

  return [
    check(
      "dalil_theme_alignment",
      "Kesesuaian dalil dengan tema",
      mismatchedItems.length === 0,
      mismatchedItems.length === 0
        ? `Dalil terpilih selaras dengan tema "${dalilContext.theme}".`
        : `Dalil berikut tampak tidak cukup terkait dengan tema "${dalilContext.theme}": ${mismatchedItems.join(", ")}.`,
      "critical"
    )
  ];
}

function themeFocusChecks(content: string, parameters: Record<string, unknown>) {
  const targetLanguage = normalizeLanguage(parameters.bahasa);
  if (targetLanguage !== "Indonesia") return [];

  const theme = topicFromParameters(parameters).trim();
  if (!theme || /^tanpa tema$/i.test(theme)) return [];

  const keywords = themeKeywords(theme);
  if (keywords.length === 0) return [];

  const matchedKeywords = countKeywordMentions(content, keywords);
  const enoughMatches = matchedKeywords >= Math.min(2, keywords.length);
  const repeatedThemeMention = normalizeTopicText(content).includes(normalizeTopicText(theme));
  const domain = themeDomainTerms(theme);
  const domainMatches = domain ? countKeywordMentions(content, domain.terms) : 0;

  return [
    check(
      "theme_focus_keywords",
      "Keterikatan tema",
      enoughMatches || repeatedThemeMention,
      enoughMatches || repeatedThemeMention
        ? `Tema "${theme}" cukup tercermin dalam isi naskah.`
        : `Isi masih terlalu umum. Kata kunci tema "${theme}" belum cukup muncul dalam uraian utama.`,
      "warning"
    ),
    ...(domain
      ? [
          check(
            "theme_focus_domain",
            `Substansi tema ${domain.label}`,
            domainMatches >= 3,
            domainMatches >= 3
              ? `Substansi khusus ${domain.label} terdeteksi dalam isi naskah.`
              : `Isi masih terlalu generik untuk tema ${domain.label}; perlu memuat bahasan seperti ${domain.terms.slice(0, 5).join(", ")}.`,
            "warning"
          )
        ]
      : [])
  ];
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
  const templateHits = templateLanguageHits(content);
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
      "template_language",
      "Bahasa terlalu template",
      templateHits.length === 0,
      templateHits.length === 0
        ? "Tidak ada pola bahasa template yang dominan."
        : `Terdeteksi pola bahasa yang terasa template: ${[...new Set(templateHits)].join(", ")}.`,
      "warning"
    ),
    ...themeFocusChecks(content, parameters),
    ...dalilThemeAlignmentChecks(dalilContext),
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
    metric("context", "Konteks", checks),
    metricFromChecks("editorial", "Editorial", checks.filter((item) => item.id === "template_language" || item.id.startsWith("theme_focus_")))
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
