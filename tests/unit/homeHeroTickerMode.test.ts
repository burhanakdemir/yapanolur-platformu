import { describe, expect, it } from "vitest";
import {
  parseHomeHeroTickerMode,
  resolveHomeHeroTickerDisplay,
} from "@/lib/homeHeroTickerMode";

describe("homeHeroTickerMode", () => {
  it("parses known modes and defaults to auto", () => {
    expect(parseHomeHeroTickerMode("sponsors")).toBe("sponsors");
    expect(parseHomeHeroTickerMode("new_members")).toBe("new_members");
    expect(parseHomeHeroTickerMode("auto")).toBe("auto");
    expect(parseHomeHeroTickerMode("invalid")).toBe("auto");
  });

  it("resolves auto to sponsors when slides exist", () => {
    expect(resolveHomeHeroTickerDisplay("auto", 2)).toBe("sponsors");
    expect(resolveHomeHeroTickerDisplay("auto", 0)).toBe("new_members");
  });

  it("respects explicit modes", () => {
    expect(resolveHomeHeroTickerDisplay("sponsors", 0)).toBe("sponsors");
    expect(resolveHomeHeroTickerDisplay("new_members", 5)).toBe("new_members");
  });
});
