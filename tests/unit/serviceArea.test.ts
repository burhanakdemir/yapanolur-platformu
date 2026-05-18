import { describe, expect, it } from "vitest";
import {
  buildAdServiceAreaFilter,
  isDistrictAllowed,
  isProvinceAllowed,
  locationNamesEqual,
  parseServiceAreaFromSettings,
  validateServiceAreaLocation,
} from "@/lib/serviceArea";

describe("parseServiceAreaFromSettings", () => {
  it("defaults to Antalya with all districts", () => {
    const area = parseServiceAreaFromSettings({});
    expect(area.provinces).toEqual(["Antalya"]);
    expect(isDistrictAllowed(area, "Antalya", "Muratpaşa")).toBe(true);
  });

  it("parses district whitelist", () => {
    const area = parseServiceAreaFromSettings({
      serviceAreaProvincesJson: '["Antalya"]',
      serviceAreaDistrictsJson: '{"Antalya":["Kepez","Muratpaşa"]}',
    });
    expect(isDistrictAllowed(area, "Antalya", "Kepez")).toBe(true);
    expect(isDistrictAllowed(area, "Antalya", "Alanya")).toBe(false);
  });
});

describe("validateServiceAreaLocation", () => {
  const area = parseServiceAreaFromSettings({
    serviceAreaProvincesJson: '["Antalya"]',
    serviceAreaDistrictsJson: "{}",
  });

  it("rejects Istanbul", () => {
    const r = validateServiceAreaLocation(area, "İstanbul", "Kadıköy");
    expect(r.ok).toBe(false);
  });

  it("accepts Antalya district", () => {
    const r = validateServiceAreaLocation(area, "Antalya", "Kepez");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.province).toBe("Antalya");
    }
  });
});

describe("buildAdServiceAreaFilter", () => {
  const area = parseServiceAreaFromSettings({
    serviceAreaProvincesJson: '["Antalya"]',
  });

  it("restricts to Antalya when no param", () => {
    expect(buildAdServiceAreaFilter(area)).toEqual({ province: "Antalya" });
  });

  it("returns empty for foreign province param", () => {
    expect(buildAdServiceAreaFilter(area, { province: "İstanbul" })).toEqual({ id: { in: [] } });
  });
});

describe("locationNamesEqual", () => {
  it("compares Turkish locale", () => {
    expect(locationNamesEqual("ANTALYA", "antalya")).toBe(true);
  });
});

describe("isProvinceAllowed", () => {
  it("matches canonical name", () => {
    const area = parseServiceAreaFromSettings({ serviceAreaProvincesJson: '["Antalya"]' });
    expect(isProvinceAllowed(area, "Antalya")).toBe(true);
  });
});
