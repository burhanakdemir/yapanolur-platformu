/**
 * Ödeme geri dönüşleri ve mutlak URL tabanı.
 * Ağdan (LAN) erişimde `.env` içinde `APP_URL` / `NEXTAUTH_URL`, tarayıcıda açtığınız adresle
 * aynı host ve protokol olmalı (ör. `https://192.168.x.x:3000`); DHCP ile IP değişince güncelleyin.
 */
export function getAppUrl(): string {
  const raw = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").trim();
  return raw.replace(/\/+$/, "");
}

/**
 * `metadataBase` ve benzeri yerler: geçersiz / protokolsüz `APP_URL` tüm sayfayı (CSS dahil) kırabiliyor.
 */
export function getSafeMetadataBase(): URL {
  const raw = getAppUrl();
  if (!raw) {
    return new URL("http://localhost:3000");
  }
  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw);
    }
    return new URL(`http://${raw}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}
