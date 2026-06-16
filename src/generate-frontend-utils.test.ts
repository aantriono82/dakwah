import { describe, expect, test } from "bun:test";
import { categoryForJenis, jenisCategoryMeta } from "./frontend/src/lib/generate-meta";
import { buildSectionBlocks, extractSectionMarkers, findActiveSectionIndex } from "./frontend/src/lib/generate-sections";

describe("generate frontend utilities", () => {
  test("categoryForJenis maps jenis into stable categories", () => {
    expect(categoryForJenis("khutbah-jumat")).toBe("khutbah");
    expect(categoryForJenis("idul-fitri")).toBe("khutbah");
    expect(categoryForJenis("ceramah")).toBe("ceramah");
    expect(categoryForJenis("kultum")).toBe("kultum");
    expect(jenisCategoryMeta.khutbah.label).toBe("Khutbah");
  });

  test("extractSectionMarkers finds unique headings and previews", () => {
    const content = [
      "Pembuka",
      "Mukadimah singkat",
      "",
      "Dalil:",
      "QS. Al-Ashr",
      "",
      "Penutup",
      "Ajak jamaah bertakwa",
      "",
      "Pembuka",
      "Tidak boleh dobel"
    ].join("\n");

    const markers = extractSectionMarkers(content);
    expect(markers).toEqual([
      { label: "Pembuka", line: 0, preview: "Mukadimah singkat" },
      { label: "Dalil", line: 3, preview: "QS. Al-Ashr" },
      { label: "Penutup", line: 6, preview: "Ajak jamaah bertakwa" }
    ]);
  });

  test("buildSectionBlocks and active index follow cursor location", () => {
    const content = [
      "Pembuka",
      "Mukadimah singkat",
      "",
      "Dalil",
      "QS. Al-Ashr",
      "",
      "Penutup",
      "Ajak jamaah bertakwa"
    ].join("\n");

    const markers = extractSectionMarkers(content);
    const blocks = buildSectionBlocks(content, markers);

    expect(blocks).toHaveLength(3);
    expect(blocks[1]?.label).toBe("Dalil");
    expect(blocks[1]?.text).toContain("QS. Al-Ashr");

    const cursorInDalil = content.indexOf("QS. Al-Ashr");
    expect(findActiveSectionIndex(content, blocks, cursorInDalil)).toBe(1);
  });
});
