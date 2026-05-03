/**
 * Aynı ilanda detay görüntüleme veya teklif erişimi ücretlerinden biri ödendiyse
 * diğeri de aynı ilan için tekrar istenmez.
 */
type AdAccessPaidFields = {
  detailPaidAt: Date | null;
  bidAccessPaidAt: Date | null;
};

export function hasPaidDetailView(
  row: AdAccessPaidFields | null | undefined,
): boolean {
  return Boolean(row?.detailPaidAt || row?.bidAccessPaidAt);
}

export function hasPaidBidAccess(
  row: AdAccessPaidFields | null | undefined,
): boolean {
  return Boolean(row?.bidAccessPaidAt || row?.detailPaidAt);
}

/** Teklif için canBid / yanıtlarda kullanılacak tek zaman damgası */
export function effectiveBidAccessAt(
  row: AdAccessPaidFields | null | undefined,
): Date | null {
  if (!row) return null;
  return row.bidAccessPaidAt ?? row.detailPaidAt ?? null;
}
