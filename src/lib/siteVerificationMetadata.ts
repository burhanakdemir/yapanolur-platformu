import type { Metadata } from "next";

/**
 * Env’e bazen yalnızca token, bazen tüm `<meta name="google-site-verification" … />` satırı yapıştırılır.
 * Next.js `verification.google` yalnızca `content` değerini ister; etiket verilmişse ayıkla.
 */
function normalizeGoogleSiteVerification(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (/<meta\s/i.test(s) || /content\s*=/i.test(s)) {
    const m = s.match(/content\s*=\s*["']([^"']+)["']/i);
    return m?.[1]?.trim() || undefined;
  }
  return s;
}

/** Bing `msvalidate.01` için benzer: yalnızca kod veya içinde `content="..."` geçen parça. */
function normalizeBingSiteVerification(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (/<meta\s/i.test(s) || /content\s*=/i.test(s)) {
    const m = s.match(/content\s*=\s*["']([^"']+)["']/i);
    return m?.[1]?.trim() || undefined;
  }
  return s;
}

/**
 * Search Console / Bing HTML doğrulaması → `<meta name="google-site-verification">` vb.
 * Önce sunucu-only anahtarlar (istemci paketine sızmaz); yoksa NEXT_PUBLIC yedeği.
 */
export function siteVerificationMetadata(): Pick<Metadata, "verification"> | Record<string, never> {
  const google = normalizeGoogleSiteVerification(
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim(),
  );
  const bing = normalizeBingSiteVerification(
    process.env.BING_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim(),
  );
  if (!google && !bing) {
    return {};
  }
  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}
