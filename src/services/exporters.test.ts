import { describe, expect, test } from "bun:test";
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
});
