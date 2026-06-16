import { describe, expect, test } from "bun:test";
import { requestWantsServerWebResearch } from "./webResearch";

describe("web research", () => {
  test("always enables server-side web research by default", () => {
    expect(requestWantsServerWebResearch({})).toBe(true);
    expect(requestWantsServerWebResearch({ modeSumberInternet: "manual" })).toBe(true);
    expect(requestWantsServerWebResearch({ modeSumberInternet: "web-search" })).toBe(true);
  });
});
