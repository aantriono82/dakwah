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
});
