import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/authSecret";

export const SIGNUP_PHONE_COOKIE = "signup_phone_proof";

const TYP = "signup_phone_ok";

export async function createSignupPhoneProofToken(email: string, phoneE164: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const phone = phoneE164.trim();
  return new SignJWT({ email: normalizedEmail, phoneE164: phone, typ: TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getAuthSecretKey());
}

export async function verifySignupPhoneProofToken(
  token: string | undefined,
  expectedEmail: string,
  expectedPhoneE164: string,
): Promise<boolean> {
  if (!token?.trim()) return false;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    const p = payload as { email?: string; phoneE164?: string; typ?: string };
    if (p.typ !== TYP || typeof p.email !== "string" || typeof p.phoneE164 !== "string") return false;
    return (
      p.email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() &&
      p.phoneE164.trim() === expectedPhoneE164.trim()
    );
  } catch {
    return false;
  }
}
