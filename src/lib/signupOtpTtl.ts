/**
 * Kayıt e-posta ve telefon OTP geçerlilik süresi (dakika).
 * Ortam: SIGNUP_OTP_TTL_MINUTES (1–60, varsayılan 15).
 * Üretimde e-posta gecikmesi için 10–15 dakika önerilir.
 */
export function getSignupOtpTtlMinutes(): number {
  const raw = process.env.SIGNUP_OTP_TTL_MINUTES?.trim();
  if (!raw) return 15;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 15;
  return Math.min(60, Math.max(1, n));
}

/** İstemci ve sunucu için tutarlı Türkçe süre etiketi (UI metinleri). */
export function formatSignupOtpTtlTr(minutes: number): string {
  const m = Math.floor(Math.min(60, Math.max(1, minutes)));
  if (m <= 1) return "1 dakika";
  return `${m} dakika`;
}
