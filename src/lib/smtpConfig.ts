/**
 * Sadece ortam değişkeni tabanlı varsayılan “From” (panel/env çözümü `resolveSmtpConfig` içinde).
 */
export function getDefaultSmtpFromAddress(): string {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost").trim();
}

function looksLikeBareEmail(s: string): boolean {
  return /^[^\s<>]+@[^\s<>]+$/.test(s.trim());
}

/**
 * `From` başlığından MAIL FROM için düz adres çıkarır (`İsim <x@y.com>` veya `x@y.com`).
 */
export function smtpBareEmailFromHeader(fromField: string): string | null {
  const t = fromField.trim();
  if (!t) return null;
  const m = t.match(/<([^<>]+)>/);
  const inner = (m ? m[1] : t).trim().replace(/^["']|["']$/g, "");
  return looksLikeBareEmail(inner) ? inner : null;
}

/**
 * SMTP zarfı için geçerli e-posta: önce From başlığı, yoksa AUTH kullanıcısı (@ içeriyorsa).
 * Resend gibi sağlayıcılarda kullanıcı adı `resend` olduğundan zarf mutlaka gerçek adres olmalıdır.
 */
export function smtpEnvelopeMailFrom(fromHeader: string, authUser: string): string | null {
  const fromHdr = smtpBareEmailFromHeader(fromHeader);
  if (fromHdr) return fromHdr;
  const u = authUser.trim();
  return looksLikeBareEmail(u) ? u : null;
}

/**
 * MAIL FROM zarfini acikca AUTH kullanicisina sabitle (DMARC). Bazi MTA'lar From ile uyumsuz zarf reddeder.
 * Bu durumda: SMTP_EXPLICIT_ENVELOPE=0 veya false
 */
export function smtpExplicitEnvelopeEnabled(): boolean {
  return process.env.SMTP_EXPLICIT_ENVELOPE !== "0" && process.env.SMTP_EXPLICIT_ENVELOPE !== "false";
}
