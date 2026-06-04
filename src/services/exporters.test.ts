import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { createDocx, createPdf } from "./exporters";

describe("document exporters", () => {
  test("createPdf returns a PDF document buffer", async () => {
    const file = await createPdf("Ceramah Amanah", "Isi ceramah tentang amanah.");
    const header = new TextDecoder().decode(file.slice(0, 5));

    expect(file).toBeInstanceOf(Uint8Array);
    expect(file.byteLength).toBeGreaterThan(100);
    expect(header).toBe("%PDF-");
  });

  test("createDocx returns a zipped Office document buffer", async () => {
    const file = await createDocx("Ceramah Amanah", "Paragraf pertama.\n\nParagraf kedua.");
    const header = new TextDecoder().decode(file.slice(0, 2));

    expect(file).toBeInstanceOf(Uint8Array);
    expect(file.byteLength).toBeGreaterThan(100);
    expect(header).toBe("PK");
  });

  test("createDocx keeps mixed Arabic and Latin text in separate runs with Amiri font", async () => {
    const file = await createDocx(
      "Kultum: cinta",
      "Pembuka اَلْحَمْدُ لِلّٰهِ.\nDalil فَاتَّقُوا اللهَ. Artinya: Maka bertakwalah."
    );
    const zip = await JSZip.loadAsync(file);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("Pembuka ");
    expect(documentXml).toContain("اَلْحَمْدُ لِلّٰهِ.");
    expect(documentXml).toContain('w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:cs="Amiri"');
    expect(documentXml).toContain("<w:rtl/>");
    expect(documentXml).toContain("Artinya: Maka bertakwalah.");
  });
});
