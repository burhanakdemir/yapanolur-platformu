let cached: Uint8Array | null = null;

/** Oturum ve yönetici kapı JWT imzaları için — yalnızca `AUTH_SECRET` ortam değişkeni. */
export function getAuthSecretKey(): Uint8Array {
  if (cached) return cached;
  const s = process.env.AUTH_SECRET?.trim();
  if (!s) {
    throw new Error(
      "AUTH_SECRET ortam degiskeni tanimlanmali. .env dosyasina rastgele uzun bir deger ekleyin (ornegin: openssl rand -base64 32).",
    );
  }
  cached = new TextEncoder().encode(s);
  return cached;
}
