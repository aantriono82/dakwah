import { describe, expect, test } from "bun:test";
import { buildSectionAiInstruction, quickFixInstruction } from "./frontend/src/lib/generate-instructions";

describe("generate instructions", () => {
  test("quickFixInstruction stays specific per fix type", () => {
    expect(quickFixInstruction("theme_focus")).toContain("Perkuat fokus tema");
    expect(quickFixInstruction("language_flow")).toContain("Perhalus bahasa naskah");
    expect(quickFixInstruction("dalil_alignment")).toContain("Rapikan penggunaan dalil");
  });

  test("buildSectionAiInstruction scopes revision to active section", () => {
    const activeSection = {
      label: "Dalil",
      line: 3,
      preview: "QS. Al-Ashr",
      start: 10,
      end: 40,
      text: "Dalil\nQS. Al-Ashr"
    };

    const instruction = buildSectionAiInstruction(activeSection, "closing");
    expect(instruction).toContain('section "Dalil"');
    expect(instruction).toContain("Jangan ubah section lain");
  });
});
