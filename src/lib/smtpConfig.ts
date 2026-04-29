/**
 * Sadece ortam değişkeni tabanlı varsayılan “From” (panel/env çözümü `resolveSmtpConfig` içinde).
 */
export function getDefaultSmtpFromAddress(): string {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost").trim();
}

/**
 * MAIL FROM zarfini acikca AUTH kullanicisina sabitle (DMARC). Bazi MTA'lar From ile uyumsuz zarf reddeder.
 * Bu durumda: SMTP_EXPLICIT_ENVELOPE=0 veya false
 */
export function smtpExplicitEnvelopeEnabled(): boolean {
  return process.env.SMTP_EXPLICIT_ENVELOPE !== "0" && process.env.SMTP_EXPLICIT_ENVELOPE !== "false";
}
