/** İlan erişim modalı / sayfasında gösterilen özet (ilan no, üst/alt kategori, il/ilçe). */

export type AdAccessSummaryAd = {
  listingNumber: number;
  /** API uyumluluğu; arayüzde gösterilmez. */
  title?: string;
  province?: string;
  district?: string;
  topCategoryName?: string | null;
  subCategoryName?: string | null;
};

export function AdAccessAdSummary({
  ad,
  lang,
  className = "",
}: {
  ad: AdAccessSummaryAd;
  lang: "tr" | "en";
  className?: string;
}) {
  const labels =
    lang === "tr"
      ? {
          listingNo: "İlan no",
          topCat: "Üst kategori",
          subCat: "Alt kategori",
          loc: "İl / İlçe",
          empty: "—",
        }
      : {
          listingNo: "Listing no.",
          topCat: "Top category",
          subCat: "Subcategory",
          loc: "Province / District",
          empty: "—",
        };

  const top = ad.topCategoryName?.trim() || labels.empty;
  const sub = ad.subCategoryName?.trim() || labels.empty;
  const prov = ad.province?.trim() || labels.empty;
  const dist = ad.district?.trim() || labels.empty;

  return (
    <div
      className={`space-y-1.5 rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm shadow-sm ${className}`}
    >
      <p className="font-semibold tabular-nums text-slate-900">
        {labels.listingNo}: <span className="text-orange-900">{ad.listingNumber}</span>
      </p>
      <p className="text-slate-800">
        <span className="text-slate-500">{labels.topCat}:</span> {top}
      </p>
      <p className="text-slate-800">
        <span className="text-slate-500">{labels.subCat}:</span> {sub}
      </p>
      <p className="text-slate-800">
        <span className="text-slate-500">{labels.loc}:</span>{" "}
        <span className="font-medium">{prov}</span>
        <span className="text-slate-400"> / </span>
        <span className="font-medium">{dist}</span>
      </p>
    </div>
  );
}
