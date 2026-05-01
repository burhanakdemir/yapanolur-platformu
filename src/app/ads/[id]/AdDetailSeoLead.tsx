import { displayAdDescription, displayAdTitle } from "@/lib/adTitleDisplay";
import { truncateForSeoPreview } from "@/lib/metadataHelpers";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  detailFeeRequired: boolean;
  ad: {
    title: string;
    description: string;
    listingNumber: number;
    province: string;
    district: string;
    neighborhood: string;
    startingPriceTry: number;
    auctionEndsAt: Date | null;
    category: { name: string; parent: { name: string } | null } | null;
  };
};

export default function AdDetailSeoLead({ ad, lang, detailFeeRequired }: Props) {
  const title = displayAdTitle(ad.title);
  const excerpt = truncateForSeoPreview(displayAdDescription(ad.description), 520);
  const catLine = ad.category
    ? ad.category.parent
      ? `${ad.category.parent.name} › ${ad.category.name}`
      : ad.category.name
    : lang === "en"
      ? "—"
      : "—";
  const loc = [ad.province, ad.district, ad.neighborhood].filter(Boolean).join(" · ");

  const priceStr = ad.startingPriceTry.toLocaleString(lang === "en" ? "en-GB" : "tr-TR");
  const endsLabel =
    ad.auctionEndsAt && !Number.isNaN(new Date(ad.auctionEndsAt).getTime())
      ? new Date(ad.auctionEndsAt).toLocaleString(lang === "en" ? "en-GB" : "tr-TR", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pt-6 pb-2" aria-labelledby="listing-seo-summary-heading">
      <article className="rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/40 px-4 py-4 shadow-sm ring-1 ring-orange-100/80 sm:px-5 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/75">
          {lang === "tr" ? "İlan özeti" : "Listing summary"}
        </p>
        <h1
          id="listing-seo-summary-heading"
          className="mt-2 text-2xl font-bold leading-snug tracking-tight text-orange-950 sm:text-3xl"
        >
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-800">{excerpt}</p>
        <dl className="mt-4 grid gap-x-4 gap-y-2 border-t border-orange-200/70 pt-4 text-sm sm:grid-cols-[minmax(0,10rem)_1fr]">
          <dt className="font-bold text-slate-700">{lang === "tr" ? "İlan no" : "Listing no."}</dt>
          <dd className="tabular-nums font-semibold text-slate-950">{ad.listingNumber}</dd>
          <dt className="font-bold text-slate-700">{lang === "tr" ? "Kategori" : "Category"}</dt>
          <dd className="min-w-0 font-semibold text-slate-950">{catLine}</dd>
          <dt className="font-bold text-slate-700">{lang === "tr" ? "Konum" : "Location"}</dt>
          <dd className="min-w-0 font-semibold text-slate-950">{loc || "—"}</dd>
          <dt className="font-bold text-slate-700">{lang === "tr" ? "Başlangıç fiyatı" : "Starting price"}</dt>
          <dd className="tabular-nums font-semibold text-slate-950">{priceStr} TL</dd>
          {endsLabel ? (
            <>
              <dt className="font-bold text-slate-700">{lang === "tr" ? "İhale bitişi" : "Auction ends"}</dt>
              <dd className="tabular-nums font-semibold text-slate-950">{endsLabel}</dd>
            </>
          ) : null}
        </dl>
        {detailFeeRequired ? (
          <p className="mt-3 text-xs leading-snug text-slate-600">
            {lang === "tr"
              ? "Tam açıklama, görseller ve etkileşimli detay için giriş yapıp gerekiyorsa erişim ücretini tamamlamanız istenebilir."
              : "Full description, images, and interactive detail may require signing in and completing an access fee where applicable."}
          </p>
        ) : null}
      </article>
    </section>
  );
}
