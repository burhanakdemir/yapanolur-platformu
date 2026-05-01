import { isAllowedUploadUrl } from "@/lib/uploadUrl";

/** Hero görseli: `/uploads/…` veya allowlist HTTPS URL (S3/blob vb.). */
export function isAllowedHeroImageUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.startsWith("/uploads/")) return true;
  return isAllowedUploadUrl(raw);
}

/** CTA: göreli site yolu veya https:// (geliştirmede http://localhost). */
export function isAllowedHeroCtaUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:") return true;
    if (
      u.protocol === "http:" &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    ) {
      return process.env.NODE_ENV === "development";
    }
    return false;
  } catch {
    return false;
  }
}
