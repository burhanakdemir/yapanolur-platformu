/**
 * Başlık / açıklamada ilk `#` ve sonrası kesilir (etiket / not engeli).
 * Canlı yazımda `.trim()` kullanılmaz; aksi halde kelime arası boşluk yazılamaz.
 */
export function stripHashAndAfter(value: string): string {
  const s = String(value);
  const i = s.indexOf("#");
  return i === -1 ? s : s.slice(0, i);
}

/** API / kayıt öncesi: `#` sonrası atılır, baş/son boşluklar temizlenir. */
export function normalizeAdTextForStorage(value: string): string {
  return stripHashAndAfter(value).trim();
}

/**
 * Eski örnek / tohum ilanlarda başlığa yazılmış "#234" önekini gösterimden kaldırır.
 * İlan numarası `listingNumber` ile ayrı gösterildiği için başlıktaki tekrar kullanılmaz.
 * Ardından `#` ve sonrası (etiket) gösterimden çıkarılır.
 */
export function displayAdTitle(storedTitle: string): string {
  const t = storedTitle.trim();
  const stripped = t.replace(/^#\d+[\s\-–—.:]*\s*/u, "").trim();
  const intermediate = stripped.length > 0 ? stripped : t;
  const final = stripHashAndAfter(intermediate);
  const raw = final.length > 0 ? final : intermediate;
  return raw.trim();
}

/** Açıklama metninde `#` ve sonrası gösterimde kullanılmaz (eski kayıtlar dahil). */
export function displayAdDescription(stored: string): string {
  return normalizeAdTextForStorage(stored);
}
