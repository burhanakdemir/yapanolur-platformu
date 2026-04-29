import { describe, expect, it } from "vitest";
import { normalizeTrPhone } from "@/lib/phone";

describe("normalizeTrPhone", () => {
  it("10 haneli yerel numarayi E.164 yapar", () => {
    expect(normalizeTrPhone("532 123 45 67")).toBe("+905321234567");
  });

  it("0 ile baslayan 11 haneyi donusturur", () => {
    expect(normalizeTrPhone("05321234567")).toBe("+905321234567");
  });

  it("bos veya gecersizde null doner", () => {
    expect(normalizeTrPhone("")).toBeNull();
    expect(normalizeTrPhone("abc")).toBeNull();
  });
});
