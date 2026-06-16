import { describe, expect, test } from "bun:test";
import {
  applyLiteralRevisionInstruction,
  isMeaningfullyDifferentRevision,
  maxTokensForRequest,
  parseOpenAIModels,
  parseOpenAIWebSearchContextSize,
  providerTextMeetsAcceptancePolicy,
  qualityFailureBlocksAcceptance,
  qualityFailureNeedsDalilRepair,
  qualityFailureNeedsEditorialRepair,
  reviseNaskahContent
} from "./openai";
import { composeTemplatedRukunKhutbah, minimumWordCountFor, missingRequiredArabicSections } from "../utils/content";

describe("OpenAI generation settings", () => {
  const configuredTokenLimit = Number(process.env.OPENAI_MAX_TOKENS ?? 5500);
  const effectiveTokenLimit = Number.isFinite(configuredTokenLimit) && configuredTokenLimit > 0 ? Math.floor(configuredTokenLimit) : 5500;

  test("parses model priority list from environment values", () => {
    expect(parseOpenAIModels(" model-a , model-b ,, model-c ", "fallback")).toEqual(["model-a", "model-b", "model-c"]);
    expect(parseOpenAIModels("", "fallback")).toEqual(["fallback"]);
  });

  test("normalizes OpenAI web search context size", () => {
    expect(parseOpenAIWebSearchContextSize("low")).toBe("low");
    expect(parseOpenAIWebSearchContextSize("HIGH")).toBe("high");
    expect(parseOpenAIWebSearchContextSize("unexpected")).toBe("medium");
    expect(parseOpenAIWebSearchContextSize()).toBe("medium");
  });

  test("caps max tokens by content type and duration", () => {
    expect(maxTokensForRequest("kultum", { durasi: "pendek" })).toBe(1600);
    expect(maxTokensForRequest("kultum", { durasi: "sedang" })).toBe(2200);
    expect(maxTokensForRequest("kultum", { durasi: "panjang" })).toBe(2800);

    expect(maxTokensForRequest("ceramah", { durasi: "pendek" })).toBe(3600);
    expect(maxTokensForRequest("ceramah", { durasi: "sedang" })).toBe(Math.min(effectiveTokenLimit, 6200));
    expect(maxTokensForRequest("ceramah", { durasi: "panjang" })).toBe(Math.min(effectiveTokenLimit, 7600));

    expect(maxTokensForRequest("khutbah-jumat", { durasi: "pendek" })).toBe(3600);
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "sedang" })).toBe(Math.min(effectiveTokenLimit, 6200));
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "panjang" })).toBe(Math.min(effectiveTokenLimit, 8000));
  });

  test("supports numeric minute duration", () => {
    expect(maxTokensForRequest("ceramah", { durasi: "20" })).toBe(Math.min(effectiveTokenLimit, 7600));
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "20 menit" })).toBe(Math.min(effectiveTokenLimit, 8000));
    expect(maxTokensForRequest("kultum", { durasi: "7 menit" })).toBe(2200);
  });

  test("only critical quality failures block first-pass acceptance", () => {
    expect(qualityFailureBlocksAcceptance({ id: "required_sections", passed: false, severity: "critical" })).toBe(true);
    expect(qualityFailureBlocksAcceptance({ id: "template_language", passed: false, severity: "warning" })).toBe(false);
    expect(qualityFailureBlocksAcceptance({ id: "human_review", passed: false, severity: "info" })).toBe(false);
    expect(qualityFailureBlocksAcceptance({ id: "required_sections", passed: true, severity: "critical" })).toBe(false);
  });

  test("final acceptance blocks editorial warnings that first pass still allows", () => {
    expect(qualityFailureBlocksAcceptance({ id: "template_language", passed: false, severity: "warning" }, "first_pass")).toBe(false);
    expect(qualityFailureBlocksAcceptance({ id: "theme_focus_keywords", passed: false, severity: "warning" }, "first_pass")).toBe(false);
    expect(qualityFailureBlocksAcceptance({ id: "template_language", passed: false, severity: "warning" }, "final")).toBe(true);
    expect(qualityFailureBlocksAcceptance({ id: "theme_focus_domain", passed: false, severity: "warning" }, "final")).toBe(true);
  });

  test("repair passes only trigger for focused dalil and editorial failures", () => {
    expect(qualityFailureNeedsDalilRepair({ id: "quran_arabic_match", passed: false })).toBe(true);
    expect(qualityFailureNeedsDalilRepair({ id: "unsupported_hadith_references", passed: false })).toBe(false);
    expect(qualityFailureNeedsEditorialRepair({ id: "template_language", passed: false })).toBe(true);
    expect(qualityFailureNeedsEditorialRepair({ id: "hadith_meaning_overlap", passed: false })).toBe(false);
  });

  test("stream acceptance is looser than first pass for short non-khutbah drafts", () => {
    const shortDraft = `Ceramah Umum

Pembukaan
Jamaah yang dirahmati Allah, mari menjaga amanah.

Isi Utama
Amanah harus dijaga dalam keluarga, pekerjaan, dan muamalah.

Penutup
Semoga Allah meneguhkan kita di atas kejujuran.`;

    expect(providerTextMeetsAcceptancePolicy("stream", "ceramah", shortDraft, { bahasa: "Indonesia", topik: "Menjaga amanah" })).toBe(true);
    expect(providerTextMeetsAcceptancePolicy("first_pass", "ceramah", shortDraft, { bahasa: "Indonesia", topik: "Menjaga amanah" })).toBe(
      false
    );
  });

  test("uses more realistic long-duration minimum word counts", () => {
    expect(minimumWordCountFor("kultum", { durasi: "panjang" })).toBe(850);
    expect(minimumWordCountFor("ceramah", { durasi: "panjang" })).toBe(1600);
    expect(minimumWordCountFor("nikah", { durasi: "panjang" })).toBe(1300);
    expect(minimumWordCountFor("khutbah-jumat", { durasi: "panjang" })).toBe(1400);
  });

  test("treats identical revision output as unchanged", () => {
    expect(isMeaningfullyDifferentRevision("Naskah awal", "Naskah awal")).toBe(false);
    expect(isMeaningfullyDifferentRevision("Naskah awal", "Naskah awal yang diperluas")).toBe(true);
  });

  test("applies literal replacement instructions", () => {
    const content = "Pernikahan ali dan ani adalah amanah.";
    const revised = applyLiteralRevisionInstruction(content, "ganti teks ali dan ani menjadi Ali dan Ani");
    expect(revised).toBe("Pernikahan Ali dan Ani adalah amanah.");
  });

  test("revision fallback does not inject meta text into content", async () => {
    const revised = await reviseNaskahContent({
      jenis: "ceramah",
      parameters: { bahasa: "Indonesia", topik: "Menjaga amanah" },
      currentContent: "Pernikahan ali dan ani adalah amanah.",
      instruction: "ganti teks ali dan ani menjadi Ali dan Ani"
    });

    expect(revised).toBe("Pernikahan Ali dan Ani adalah amanah.");
    expect(revised).not.toContain("Isi revisi");
    expect(revised).not.toContain("Redaksinya dibuat");
  });

  test("composes rukun khutbah from template around AI editorial body", () => {
    const composed = composeTemplatedRukunKhutbah(
      "khutbah-jumat",
      { bahasa: "Indonesia", temaUtama: "Menjaga amanah" },
      `Khutbah Pertama
Allah berfirman dalam Al-Quran tentang amanah.

Amanah perlu tampak dalam janji, pekerjaan, keluarga, dan cara kita menjaga hak orang lain. Ayat di atas mengingatkan bahwa kepercayaan bukan hiasan ucapan, melainkan tanggung jawab di hadapan Allah.

Rasulullah bersabda tentang tanda munafik.

Hadits tersebut menegaskan bahwa dusta, ingkar janji, dan khianat adalah kerusakan iman yang harus kita jauhi.`
    );

    expect(missingRequiredArabicSections("khutbah-jumat", composed)).toEqual([]);
    expect(composed).toContain("أَشْهَدُ");
    expect(composed).toContain("Khutbah Kedua");
    expect(composed).not.toContain("Allah berfirman dalam Al-Quran tentang amanah.");
    expect(composed).not.toContain("Rasulullah bersabda tentang tanda munafik.");
  });

  test("rejects off-topic retrieved quran when composing templated khutbah", () => {
    const composed = composeTemplatedRukunKhutbah(
      "idul-fitri",
      { bahasa: "Indonesia", tema: "menjaga silaturahmi" },
      "Ayat di atas mengingatkan bahwa Idul Fitri adalah waktu untuk menyambung hubungan keluarga, meminta maaf, dan melembutkan hati kepada saudara.",
      {
        theme: "menjaga silaturahmi",
        source: "test",
        quran: [
          {
            kind: "quran",
            reference: "QS. Al-Isra: 32",
            arab: "وَلَا تَقْرَبُوا الزِّنٰى إِنَّهُ كَانَ فَاحِشَةً وَسَاءَ سَبِيْلًا.",
            translation: "Janganlah kamu mendekati zina; sesungguhnya zina itu adalah perbuatan keji dan jalan yang buruk.",
            source: "test"
          }
        ],
        hadith: [
          {
            kind: "hadith",
            reference: "HR. Bukhari dan Muslim",
            arab: "مَنْ أَحَبَّ أَنْ يُبْسَطَ لَهُ فِيْ رِزْقِهِ وَيُنْسَأَ لَهُ فِيْ أَثَرِهِ فَلْيَصِلْ رَحِمَهُ.",
            translation: "Siapa yang ingin dilapangkan rezekinya dan dipanjangkan jejak kebaikannya, hendaklah ia menyambung silaturahmi.",
            source: "test"
          }
        ]
      }
    );

    expect(composed).toContain("QS. An-Nisa: 1");
    expect(composed).toContain("peliharalah hubungan kekerabatan");
    expect(composed).not.toContain("QS. Al-Isra: 32");
    expect(composed).not.toContain("Janganlah kamu mendekati zina");
    expect(composed).toContain("hendaklah ia menyambung silaturahmi");
  });
});
