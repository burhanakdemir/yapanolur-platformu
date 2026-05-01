"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AuctionCountdown from "@/components/AuctionCountdown";
import { HOME_MAIN_CATEGORY_TILE_CARD } from "@/lib/homeMainCategoryTileClass";
import { isAllowedUploadUrl } from "@/lib/uploadUrl";

export type HomeAuctionItem = {
  id: string;
  listingNumber: number;
  title: string;
  description: string;
  createdAt: string;
  showcaseUntil: string | null;
  province: string;
  district: string;
  neighborhood: string;
  startingPriceTry: number;
  auctionEndsAt: string | null;
  categoryCard: {
    mainLabel: string;
    subLabel: string | null;
    imageUrl: string | null;
  } | null;
};

/** Mobil: 2 sütun; tablet: 3; geniş: 4 (eskiden 5’ti — dar ekranlarda sıkışmayı önler). */
function gridColsForWidth(width: number): number {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

/** Kartta ilan no / durum satırı eklendi; sanallaştırıcı tahmini satır yüksekliği. */
const ESTIMATED_ROW_PX = 248;

function gridColsClass(cols: number): string {
  if (cols <= 2) return "grid-cols-2";
  if (cols === 3) return "grid-cols-3";
  return "grid-cols-4";
}

function useResponsiveGridCols(): number {
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    const update = () => setCols(gridColsForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

function mainCategoryLine(ad: HomeAuctionItem, lang: "tr" | "en"): string {
  const card = ad.categoryCard;
  if (!card) return lang === "tr" ? "Kategori yok" : "No category";
  return card.mainLabel;
}

function categoryImageUnoptimized(src: string): boolean {
  const s = src.trim();
  if (!s) return true;
  if (s.startsWith("/")) return false;
  return !isAllowedUploadUrl(s);
}

function CategoryImageThumb({ src }: { src: string }) {
  const unopt = categoryImageUnoptimized(src);
  return (
    <div className="relative h-16 w-full sm:h-20">
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
        className="pointer-events-none object-cover"
        loading="lazy"
        decoding="async"
        unoptimized={unopt}
      />
    </div>
  );
}

function ShowcaseRibbon({ showcaseUntil, lang }: { showcaseUntil: string | null; lang: "tr" | "en" }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!showcaseUntil) return;
    const end = new Date(showcaseUntil).getTime();
    if (Number.isNaN(end) || end <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [showcaseUntil]);
  const isShowcase = Boolean(showcaseUntil && new Date(showcaseUntil).getTime() > now);

  return (
    <div className="mb-1 flex h-[14px] shrink-0 items-center" aria-hidden={!isShowcase}>
      {isShowcase ? (
        <span className="showcase-vitrin-pulse relative z-[1] inline-flex rounded bg-amber-100 px-1 py-px text-[8px] font-semibold leading-none text-black">
          {lang === "tr" ? "VITRIN" : "SHOWCASE"}
        </span>
      ) : (
        <span className="invisible text-[8px] leading-none">—</span>
      )}
    </div>
  );
}

function cardStatusLabel(ad: HomeAuctionItem, lang: "tr" | "en"): string {
  const ends = ad.auctionEndsAt ? new Date(ad.auctionEndsAt).getTime() : null;
  const now = Date.now();
  if (ends !== null && !Number.isNaN(ends) && ends <= now) {
    return lang === "tr" ? "Süresi doldu" : "Ended";
  }
  return lang === "tr" ? "Açık ihale" : "Open";
}

const AuctionGridCard = memo(function AuctionGridCard({
  ad,
  lang,
}: {
  ad: HomeAuctionItem;
  lang: "tr" | "en";
}) {
  const categoryImageUrl = ad.categoryCard?.imageUrl?.trim() || null;
  const href = lang === "en" ? `/ads/${ad.id}?lang=en` : `/ads/${ad.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={
        lang === "tr"
          ? `${ad.title}. İlan detayına git.`
          : `${ad.title}. Go to listing page.`
      }
      className="glass-card group flex h-full min-h-[158px] w-full min-w-0 cursor-pointer touch-manipulation flex-col gap-0 rounded-lg border border-transparent p-1 sm:min-h-[176px] sm:p-1.5 text-left shadow-sm transition-[border-color,box-shadow,background-color,color] duration-150 hover:!border-orange-400/80 hover:!bg-orange-200/85 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 active:scale-[0.98]"
    >
      <ShowcaseRibbon showcaseUntil={ad.showcaseUntil} lang={lang} />
      <div className="flex min-h-0 flex-col gap-0 leading-none">
        <div className={HOME_MAIN_CATEGORY_TILE_CARD} title={mainCategoryLine(ad, lang)}>
          {mainCategoryLine(ad, lang)}
        </div>
        <div className="mt-1 min-h-[1.125rem]">
          {ad.categoryCard?.subLabel ? (
            <p className="auction-card-subcategory-glow line-clamp-1 text-[11px] font-bold leading-none text-slate-600">
              {ad.categoryCard.subLabel}
            </p>
          ) : (
            <span className="invisible block text-[11px] leading-none">.</span>
          )}
        </div>
        <p className="line-clamp-1 text-[11px] font-bold leading-none text-slate-600">
          <span className="text-slate-600">{lang === "tr" ? "Konum:" : "Loc.:"}</span> {ad.province} /{" "}
          {ad.district}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold leading-none text-slate-500">
          <span className="tabular-nums text-slate-600">
            {lang === "tr" ? "İlan no" : "Listing"} #{ad.listingNumber}
          </span>
          <span className="mx-1 text-slate-300" aria-hidden>
            ·
          </span>
          <span className="text-orange-800/90">{cardStatusLabel(ad, lang)}</span>
        </p>
      </div>
      <div className="mt-1 -mx-1 shrink-0 overflow-hidden rounded border border-slate-200/80 sm:-mx-1.5">
        {categoryImageUrl ? (
          <CategoryImageThumb src={categoryImageUrl} />
        ) : (
          <div
            className="flex h-16 w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400 sm:h-20"
            aria-hidden
          >
            —
          </div>
        )}
      </div>
      <div className="mt-auto flex min-h-[1.75rem] items-center gap-1 pt-0.5">
        <div className="min-w-0 flex-1">
          <AuctionCountdown
            endsAt={ad.auctionEndsAt || new Date("2030-01-01T00:00:00.000Z").toISOString()}
            lang={lang}
            compact
          />
        </div>
        <span className="chip shrink-0 px-1.5 py-0.5 text-[10px] font-medium leading-none transition-colors group-hover:border-orange-500/70 group-hover:bg-orange-300/50">
          {lang === "tr" ? "Detay" : "Details"}
        </span>
      </div>
    </Link>
  );
});

/**
 * Sanal kaydırma state’i burada kalır; üst bileşen (modal + başlık) liste kaydırılırken yeniden çizilmez.
 */
export default function HomeAuctionsVirtualGrid({
  initialAuctions,
  lang,
}: {
  initialAuctions: HomeAuctionItem[];
  lang: "tr" | "en";
}) {
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const gridCols = useResponsiveGridCols();

  const rows = useMemo(() => {
    const out: HomeAuctionItem[][] = [];
    const step = Math.max(1, gridCols);
    for (let i = 0; i < initialAuctions.length; i += step) {
      out.push(initialAuctions.slice(i, i + step));
    }
    return out;
  }, [initialAuctions, gridCols]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_ROW_PX,
    overscan: 4,
  });

  useEffect(() => {
    rowVirtualizer.scrollToOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca sütun kırılımı değişince kaydır
  }, [gridCols]);

  return (
    <div
      ref={scrollParentRef}
      className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-orange-200/55 bg-white/25 p-1.5 shadow-inner [scrollbar-gutter:stable] sm:p-2.5"
      tabIndex={0}
      role="region"
      aria-label={lang === "tr" ? "İlan listesi" : "Listing grid"}
    >
      {rows.length === 0 ? null : (
        <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={`grid h-full items-stretch gap-1.5 sm:gap-2 ${gridColsClass(gridCols)}`}
                >
                  {row.map((ad) => (
                    <AuctionGridCard key={ad.id} ad={ad} lang={lang} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
