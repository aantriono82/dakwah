import { describe, expect, test } from "bun:test";
import { qualityReportFor } from "./quality";
import type { PromptDalilContext } from "./content";

const dalilContext: PromptDalilContext = {
  theme: "Sabar menghadapi musibah",
  source: "Kurasi admin",
  quran: [
    {
      kind: "quran",
      reference: "QS. Al-Baqarah: 153",
      translation: "Mohonlah pertolongan dengan sabar dan shalat.",
      source: "Kurasi admin"
    }
  ],
  hadith: [
    {
      kind: "hadith",
      reference: "HR. Muslim",
      translation: "Sungguh menakjubkan keadaan seorang mukmin.",
      source: "Kurasi admin",
      grade: "Sahih"
    }
  ]
};

describe("quality dalil validation", () => {
  test("checks selected dalil references and flags extra quran references", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Allah SWT berfirman dalam AlQuran
QS. Al-Baqarah: 153 menjelaskan kesabaran.

Rasulullah SAW bersabda
HR. Muslim menyebut keadaan mukmin.

Isi tambahan juga menyebut QS. Al-Ikhlas: 1.`,
      { bahasa: "Indonesia", topik: "Sabar menghadapi musibah" },
      dalilContext
    );

    expect(report.checks.find((item) => item.id === "selected_dalil_references")?.passed).toBe(true);
    expect(report.checks.find((item) => item.id === "unsupported_quran_references")?.passed).toBe(false);
  });

  test("flags template language patterns in generated prose", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Pembukaan
Hadirin yang dirahmati Allah, tema ini mengingatkan kita untuk menjadi pribadi yang lebih baik.

Allah SWT berfirman dalam AlQuran
QS. Al-Baqarah: 153

Rasulullah SAW bersabda
HR. Muslim

Isi Utama
Pada kesempatan kali ini marilah kita bersama-sama meningkatkan kesabaran dalam hidup.`,
      { bahasa: "Indonesia", topik: "Sabar menghadapi musibah" },
      dalilContext
    );

    expect(report.checks.find((item) => item.id === "template_language")?.passed).toBe(false);
  });

  test("flags content that stays too generic for the selected Indonesian theme", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Pembukaan
Jamaah yang dirahmati Allah, marilah kita tingkatkan iman dan takwa kepada Allah dalam setiap keadaan.

Allah SWT berfirman dalam AlQuran
QS. Al-Baqarah: 153 menjelaskan pentingnya kembali kepada Allah.

Rasulullah SAW bersabda
HR. Muslim mengingatkan bahwa mukmin akan mendapatkan kebaikan.

Isi Utama
Dalam kehidupan sehari-hari kita perlu memperbaiki ibadah, menjaga akhlak, memperbanyak doa, dan saling menolong.
Nasihat ini penting untuk siapa pun agar hidup menjadi lebih baik dan lebih tenang.
Marilah kita memperkuat iman dalam keluarga, pekerjaan, dan masyarakat.`,
      { bahasa: "Indonesia", topik: "Bahaya judi online pada keluarga muda" }
    );

    expect(report.checks.find((item) => item.id === "theme_focus_keywords")?.passed).toBe(false);
  });

  test("does not apply Indonesian theme-keyword gate to non-Indonesian output", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Pembukaan
Jamaah sekalian, kite pacak ngajaga amanah dalam rumah tangge dan dusun.

Allah SWT berfirman dalam AlQuran
QS. Al-Baqarah: 153

Rasulullah SAW bersabda
HR. Muslim

Isi Utama
Kite mesti sabar, jujur, dan kuat nahan diri waktu ujian datang.`,
      { bahasa: "Ogan (Baturaja)", topik: "Bahaya judi online pada keluarga muda" }
    );

    expect(report.checks.find((item) => item.id === "theme_focus_keywords")).toBeUndefined();
  });
});
