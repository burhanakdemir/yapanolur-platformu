import { buildSiteGraphJsonLd } from "@/lib/siteGraphJsonLd";
import { getAppUrl } from "@/lib/appUrl";

export default function SiteWideJsonLd() {
  const jsonLd = buildSiteGraphJsonLd(getAppUrl());
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
