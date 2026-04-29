/**
 * Ödeme simülasyonu (/payments/simulate + üyenin confirm ile PAID yapması).
 * Üretimde kapalı; yalnızca NODE_ENV !== production veya ALLOW_PAYMENT_SIMULATE=1|true.
 */
export function isPaymentSimulateAllowed(): boolean {
  const v = process.env.ALLOW_PAYMENT_SIMULATE?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  return process.env.NODE_ENV !== "production";
}
