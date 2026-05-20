import { describe, expect, it } from "vitest";
import { adminUrl } from "@/lib/adminUrls";
import { sanitizeAdminNextPath, sanitizePublicNextPath } from "@/lib/safeRedirectPath";

describe("sanitizePublicNextPath", () => {
  it("allows normal paths", () => {
    expect(sanitizePublicNextPath("/panel/user")).toBe("/panel/user");
    expect(sanitizePublicNextPath("/panel/user?lang=en")).toBe("/panel/user?lang=en");
  });

  it("blocks open redirects", () => {
    expect(sanitizePublicNextPath("//evil.com")).toBe("/panel/user");
    expect(sanitizePublicNextPath("/\\evil.com")).toBe("/panel/user");
    expect(sanitizePublicNextPath("https://evil.com")).toBe("/panel/user");
    expect(sanitizePublicNextPath("/@evil.com")).toBe("/panel/user");
  });
});

describe("sanitizeAdminNextPath", () => {
  it("allows admin and executive paths", () => {
    expect(sanitizeAdminNextPath(adminUrl("/listings"))).toBe(adminUrl("/listings"));
    expect(sanitizeAdminNextPath("/executive")).toBe("/executive");
  });

  it("rejects public-only paths", () => {
    const fb = adminUrl();
    expect(sanitizeAdminNextPath("/panel/user", fb)).toBe(fb);
    expect(sanitizeAdminNextPath("//evil.com", fb)).toBe(fb);
  });
});
