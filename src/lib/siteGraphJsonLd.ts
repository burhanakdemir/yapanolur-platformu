import { BRAND_LOGO_PATH } from "@/lib/brand";

/**
 * Organization + WebSite (SearchAction yok: ana arama serbest metin `q` ile yapılmıyor).
 */
export function buildSiteGraphJsonLd(base: string): Record<string, unknown> {
  const root = base.replace(/\/+$/, "");
  const orgId = `${root}/#organization`;
  const siteId = `${root}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "İlan ve İhale Platformu",
        url: root,
        logo: `${root}${BRAND_LOGO_PATH}`,
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        name: "İlan ve İhale Platformu",
        url: root,
        publisher: { "@id": orgId },
        inLanguage: ["tr-TR", "en-GB"],
      },
    ],
  };
}
