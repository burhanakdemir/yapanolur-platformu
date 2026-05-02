import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/authSecret";

export const ADMIN_MFA_PENDING_COOKIE = "admin_mfa_pending";
export const ADMIN_TOTP_ENROLL_COOKIE = "admin_totp_enroll";

export async function createAdminMfaPendingToken(userId: string): Promise<string> {
  return new SignJWT({ typ: "admin_mfa_pending", uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getAuthSecretKey());
}

export async function verifyAdminMfaPendingToken(token?: string): Promise<{ userId: string } | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    const p = payload as { typ?: string; uid?: string };
    if (p.typ !== "admin_mfa_pending" || !p.uid?.trim()) return null;
    return { userId: p.uid.trim() };
  } catch {
    return null;
  }
}

export async function createTotpEnrollToken(userId: string, secretBase32: string): Promise<string> {
  return new SignJWT({
    typ: "admin_totp_enroll",
    uid: userId,
    sec: secretBase32,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getAuthSecretKey());
}

export async function verifyTotpEnrollToken(
  token?: string,
): Promise<{ userId: string; secretBase32: string } | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    const p = payload as { typ?: string; uid?: string; sec?: string };
    if (p.typ !== "admin_totp_enroll" || !p.uid?.trim() || !p.sec?.trim()) return null;
    return { userId: p.uid.trim(), secretBase32: p.sec.trim() };
  } catch {
    return null;
  }
}
