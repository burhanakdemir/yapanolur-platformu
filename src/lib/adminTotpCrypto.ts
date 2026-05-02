import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getAesKey(): Buffer {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s) {
    throw new Error("AUTH_SECRET tanimli olmali (admin TOTP sifrelemesi).");
  }
  return createHash("sha256").update(`admin-totp-enc|${s}`).digest();
}

/** Base32 TOTP secret -> DB alani (AES-256-GCM) */
export function encryptAdminTotpSecret(plainBase32: string): string {
  const key = getAesKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptAdminTotpSecret(stored: string): string {
  const key = getAesKey();
  const buf = Buffer.from(stored, "base64");
  if (buf.length < 12 + 16) throw new Error("Gecersiz sifreli TOTP verisi.");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
