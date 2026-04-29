import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/lib/resolveDatabaseUrl";

describe("resolveDatabaseUrl", () => {
  it("replaces @localhost in jdbc-style URL", () => {
    expect(resolveDatabaseUrl("postgresql://ilan:ilan@localhost:5432/ilan_dev")).toBe(
      "postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev",
    );
  });

  it("leaves Neon-style host unchanged", () => {
    const neon =
      "postgresql://u:p@ep-cool-123.region.aws.neon.tech/neondb?sslmode=require";
    expect(resolveDatabaseUrl(neon)).toBe(neon);
  });
});
