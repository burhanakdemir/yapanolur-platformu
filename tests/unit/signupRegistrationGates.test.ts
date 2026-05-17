import { describe, expect, it } from "vitest";
import {
  computeSignupOtpGates,
  isSignupBlockedUntilVerified,
} from "@/lib/signupRegistrationGates";

describe("computeSignupOtpGates", () => {
  it("null flags do not enable OTP gates (options loading)", () => {
    expect(computeSignupOtpGates(null, null)).toEqual({
      emailOtpGate: false,
      phoneOtpGate: false,
      phoneOtpUiEnabled: false,
    });
  });

  it("phone gate and UI only when phone required is explicitly true", () => {
    expect(computeSignupOtpGates(true, null)).toEqual({
      emailOtpGate: true,
      phoneOtpGate: false,
      phoneOtpUiEnabled: false,
    });
    expect(computeSignupOtpGates(true, true)).toEqual({
      emailOtpGate: true,
      phoneOtpGate: true,
      phoneOtpUiEnabled: true,
    });
  });

  it("false disables gates", () => {
    expect(computeSignupOtpGates(false, false)).toEqual({
      emailOtpGate: false,
      phoneOtpGate: false,
      phoneOtpUiEnabled: false,
    });
  });
});

describe("isSignupBlockedUntilVerified", () => {
  it("blocks when email OTP required and not verified", () => {
    expect(isSignupBlockedUntilVerified(false, true, false, false, true)).toBe(true);
  });

  it("does not block readonly profile", () => {
    expect(isSignupBlockedUntilVerified(true, true, true, false, false)).toBe(false);
  });
});
