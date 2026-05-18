import { describe, expect, it } from "vitest";
import { resolveProvinceSelection } from "@/lib/locationSelect";

describe("resolveProvinceSelection", () => {
  const list = [
    { id: 7, name: "Antalya" },
    { id: 34, name: "İstanbul" },
  ];

  it("prefers initial province when provided", () => {
    expect(resolveProvinceSelection(list, "İstanbul")).toEqual({
      provinceId: "34",
      provinceName: "İstanbul",
    });
  });

  it("auto-selects when only one province", () => {
    expect(resolveProvinceSelection([{ id: 7, name: "Antalya" }])).toEqual({
      provinceId: "7",
      provinceName: "Antalya",
    });
  });

  it("returns null for multiple provinces without initial", () => {
    expect(resolveProvinceSelection(list)).toBeNull();
  });
});
