import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/rateLimit";

describe("getClientIp", () => {
  it("x-forwarded-for icinde ilk IP", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("x-real-ip kullanir", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });

  it("yoksa unknown", () => {
    expect(getClientIp(new Request("http://localhost/"))).toBe("unknown");
  });
});
