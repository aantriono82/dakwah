import { describe, expect, test } from "bun:test";
import {
  applyLiteralRevisionInstruction,
  isMeaningfullyDifferentRevision,
  maxTokensForRequest,
  parseOpenAIModels,
  reviseNaskahContent
} from "./openai";

describe("OpenAI generation settings", () => {
  test("parses model priority list from environment values", () => {
    expect(parseOpenAIModels(" model-a , model-b ,, model-c ", "fallback")).toEqual(["model-a", "model-b", "model-c"]);
    expect(parseOpenAIModels("", "fallback")).toEqual(["fallback"]);
  });

  test("caps max tokens by content type and duration", () => {
    expect(maxTokensForRequest("kultum", { durasi: "pendek" })).toBe(1200);
    expect(maxTokensForRequest("kultum", { durasi: "sedang" })).toBe(1800);
    expect(maxTokensForRequest("kultum", { durasi: "panjang" })).toBe(2000);

    expect(maxTokensForRequest("ceramah", { durasi: "pendek" })).toBe(2500);
    expect(maxTokensForRequest("ceramah", { durasi: "sedang" })).toBe(3500);
    expect(maxTokensForRequest("ceramah", { durasi: "panjang" })).toBe(4000);

    expect(maxTokensForRequest("khutbah-jumat", { durasi: "pendek" })).toBe(2500);
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "sedang" })).toBe(3500);
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "panjang" })).toBe(4500);
  });

  test("supports numeric minute duration", () => {
    expect(maxTokensForRequest("ceramah", { durasi: "20" })).toBe(4000);
    expect(maxTokensForRequest("khutbah-jumat", { durasi: "20 menit" })).toBe(4500);
    expect(maxTokensForRequest("kultum", { durasi: "7 menit" })).toBe(1800);
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
});
