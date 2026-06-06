import { describe, expect, test } from "bun:test";
import { parseQuranReference, retrieveDalilContext } from "./myquran";

describe("myQuran dalil retrieval", () => {
  test("parses supported QS references", () => {
    expect(parseQuranReference("QS. Al-Baqarah: 153")).toEqual({ surah: 2, ayahStart: 153, ayahEnd: 153 });
    expect(parseQuranReference("QS. Al-'Ashr: 1-3")).toEqual({ surah: 103, ayahStart: 1, ayahEnd: 3 });
    expect(parseQuranReference("HR. Muslim")).toBeNull();
  });

  test("returns curated local dalil when myQuran is disabled", async () => {
    const previous = process.env.MYQURAN_ENABLED;
    process.env.MYQURAN_ENABLED = "false";

    try {
      const context = await retrieveDalilContext("kultum", {
        bahasa: "Indonesia",
        topikSingkat: "Sedekah dan infak"
      });

      expect(context.source).toBe("Seed dalil tematik aplikasi");
      expect(context.quran[0]).toMatchObject({
        reference: "QS. Al-Baqarah: 261"
      });
      expect(context.hadith[0]).toMatchObject({
        source: "Seed dalil tematik aplikasi"
      });
      expect(context.hadith[0].translation.length).toBeGreaterThan(0);
      expect(context.warnings ?? []).toEqual([]);
    } finally {
      if (previous === undefined) {
        delete process.env.MYQURAN_ENABLED;
      } else {
        process.env.MYQURAN_ENABLED = previous;
      }
    }
  });
});
