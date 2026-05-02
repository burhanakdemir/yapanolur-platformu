import { generateSecret, generateURI, verify } from "otplib";

/** Yeni yönetici TOTP gizliliği (Base32, Google Authenticator / uyumlu uygulamalar). */
export function generateTotpSecretBase32(): string {
  return generateSecret();
}

/** `otpauth://totp/...` URI — QR ve manuel kayıt için. */
export function buildAdminTotpKeyUri(accountEmail: string, secretBase32: string, issuer: string): string {
  const iss = issuer.trim() || "YapanolurTR";
  return generateURI({
    issuer: iss,
    label: accountEmail.trim(),
    secret: secretBase32,
  });
}

const CODE_RE = /^\d{6,8}$/;

/**
 * otplib v13: `verifySync` senkron kripto eklentisi gerektirir; Route Handler’da güvenilir olmayabiliyor.
 * Varsayılan async `verify` kullanılır. `epochTolerance` saniye cinsinden kayma penceresi (rehber: mobil için 60).
 */
const TOTP_EPOCH_TOLERANCE_SEC = 60;

/** Girdiğiniz tek kullanımlık kodu doğrular (TOTP, 30 sn, 6 hane, SHA-1 — Authenticator uyumu). */
export async function verifyTotpCode(secretBase32: string, token: string): Promise<boolean> {
  const trimmed = token.trim().replace(/\s/g, "");
  if (!CODE_RE.test(trimmed)) return false;
  try {
    const result = await verify({
      secret: secretBase32,
      token: trimmed,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SEC,
    });
    return result.valid === true;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[verifyTotpCode]", e);
    }
    return false;
  }
}
