import { describe, expect, it } from "vitest";
import {
  parseRegisterConflictResponse,
  registerConflictKind,
  registerConflictKindFromApiCode,
  registerConflictMessage,
} from "@/lib/registerConflict";

describe("registerConflictKind", () => {
  it("maps taken flags to kind", () => {
    expect(registerConflictKind(true, false)).toBe("email");
    expect(registerConflictKind(false, true)).toBe("phone");
    expect(registerConflictKind(true, true)).toBe("both");
    expect(registerConflictKind(false, false)).toBeNull();
  });
});

describe("registerConflictKindFromApiCode", () => {
  it("maps API codes", () => {
    expect(registerConflictKindFromApiCode("email_taken")).toBe("email");
    expect(registerConflictKindFromApiCode("phone_taken")).toBe("phone");
    expect(registerConflictKindFromApiCode("both_taken")).toBe("both");
    expect(registerConflictKindFromApiCode("other")).toBeNull();
  });
});

describe("parseRegisterConflictResponse", () => {
  it("returns null for non-409", () => {
    expect(parseRegisterConflictResponse(400, { code: "email_taken" })).toBeNull();
  });

  it("parses code on 409", () => {
    expect(parseRegisterConflictResponse(409, { code: "both_taken" })).toBe("both");
  });

  it("parses flags on 409 when code missing", () => {
    expect(parseRegisterConflictResponse(409, { emailTaken: true, phoneTaken: false })).toBe("email");
  });
});

describe("registerConflictMessage", () => {
  it("uses exact Turkish copy", () => {
    expect(registerConflictMessage("email")).toBe("Bu e-posta adresi ile daha önce kayıt yapılmış");
    expect(registerConflictMessage("phone")).toBe("Bu Telefon Numarası ile daha önce kayıt yapılmış");
    expect(registerConflictMessage("both")).toBe(
      "Bu e-posta adresi ve Telefon Numarası ile daha önce kayıt yapılmış",
    );
  });
});
