/**
 * Kayıt e-posta ve telefon OTP geçerlilik süresi (dakika).
 * Ortam: SIGNUP_OTP_TTL_MINUTES (1–60, varsayılan 2).
 * Posta gecikmesi çok ise ortamda örn. `10` veya `15` verin.
 */
export function getSignupOtpTtlMinutes(): number {
  const raw = process.env.SIGNUP_OTP_TTL_MINUTES?.trim();
  if (!raw) return 2;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 2;
  return Math.min(60, Math.max(1, n));
}

/** İstemci ve sunucu için tutarlı Türkçe süre etiketi (UI metinleri). */
export function formatSignupOtpTtlTr(minutes: number): string {
  const m = Math.floor(Math.min(60, Math.max(1, minutes)));
  if (m <= 1) return "1 dakika";
  return `${m} dakika`;
}
