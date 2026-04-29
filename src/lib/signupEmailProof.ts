import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/authSecret";

export const SIGNUP_EMAIL_COOKIE = "signup_email_proof";

const TYP = "signup_email_ok";

export async function createSignupEmailProofToken(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  return new SignJWT({ email: normalized, typ: TYP })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    /** Kayıt formunda e-posta sonrası telefon adımı için yeterli süre (JWT ile hizalı olmalı). */
    .setExpirationTime("2h")
    .sign(getAuthSecretKey());
}

export async function verifySignupEmailProofToken(
  token: string | undefined,
  expectedEmail: string,
): Promise<boolean> {
  if (!token?.trim()) return false;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    const p = payload as { email?: string; typ?: string };
    if (p.typ !== TYP || typeof p.email !== "string") return false;
    return p.email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  } catch {
    return false;
  }
}
