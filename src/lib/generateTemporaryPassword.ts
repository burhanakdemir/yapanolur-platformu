import { randomBytes } from "node:crypto";

/** Üye şifre sıfırlama / geçici şifre — okunabilir, tahmin zor. */
export function generateTemporaryPassword(): string {
  const core = randomBytes(9).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
  return `Yo${core}9!`;
}
