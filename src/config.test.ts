import { describe, expect, test } from "bun:test";
import { calculateGenerateClientTimeoutMs } from "./config";

describe("generate client timeout", () => {
  test("scales with model count and max provider calls per model", () => {
    expect(calculateGenerateClientTimeoutMs(30_000, 1, 3)).toBe(120_000);
    expect(calculateGenerateClientTimeoutMs(30_000, 2, 3)).toBe(210_000);
    expect(calculateGenerateClientTimeoutMs(45_000, 3, 3)).toBe(435_000);
  });
});
