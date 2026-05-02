import { generateSecret, generateURI, verifySync } from "otplib";

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

/** Girdiğiniz tek kullanımlık kodu doğrular (TOTP, 30 sn, 6 hane, SHA-1 — otplib varsayılanı). */
export function verifyTotpCode(secretBase32: string, token: string): boolean {
  const trimmed = token.trim().replace(/\s/g, "");
  if (!CODE_RE.test(trimmed)) return false;
  const result = verifySync({ secret: secretBase32, token: trimmed });
  return result.valid === true;
}
