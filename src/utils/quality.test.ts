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

  test("flags Muharram drafts that repeat the theme without Muharram substance", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Pembukaan
Hadirin yang dirahmati Allah, amalan di bulan muharram mengajak kita menjadi pribadi yang lebih baik.

Allah SWT berfirman dalam AlQuran
QS. Ali 'Imran: 102

Rasulullah SAW bersabda
HR. Bukhari dan Muslim

Isi Utama
Amalan di bulan muharram harus dimulai dari menjaga lisan, keluarga, pekerjaan, dan masyarakat.
Amalan di bulan muharram juga perlu diwujudkan dengan satu perubahan kecil yang istiqamah.
Amalan di bulan muharram menjadi cermin agar kita tidak hanya mendengar nasihat, tetapi mengamalkannya.`,
      { bahasa: "Indonesia", topik: "amalan di bulan muharram" }
    );

    expect(report.checks.find((item) => item.id === "theme_focus_keywords")?.passed).toBe(true);
    expect(report.checks.find((item) => item.id === "theme_focus_domain")?.passed).toBe(false);
  });

  test("passes Muharram domain check when the draft contains specific substance", () => {
    const report = qualityReportFor(
      "ceramah",
      `Ceramah Umum

Pembukaan
Hadirin yang dirahmati Allah, Muharram adalah bulan yang dimuliakan Allah.

Allah SWT berfirman dalam AlQuran
QS. At-Taubah: 36 menjelaskan empat bulan haram.

Rasulullah SAW bersabda
HR. Muslim menjelaskan puasa di bulan Allah, Muharram.

Isi Utama
Amalan di bulan Muharram mencakup memperbanyak puasa sunnah, terutama Asyura pada 10 Muharram.
Jamaah juga dianjurkan memahami Tasu'a pada 9 Muharram dan menjadikan awal tahun Hijriah sebagai muhasabah.
Di bulan haram ini, kita memperbanyak taubat, istighfar, sedekah, tilawah, dan menjauhi kezaliman.`,
      { bahasa: "Indonesia", topik: "amalan di bulan muharram" }
    );

    expect(report.checks.find((item) => item.id === "theme_focus_domain")?.passed).toBe(true);
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
