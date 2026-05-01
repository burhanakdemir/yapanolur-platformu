"use client";

import HomeAuctionsVirtualGrid, { type HomeAuctionItem } from "@/components/HomeAuctionsVirtualGrid";

export default function AuctionsTabs({
  initialAuctions,
  lang,
}: {
  initialTab?: "live" | "upcoming" | "expired";
  initialAuctions: HomeAuctionItem[];
  filters?: {
    categoryId?: string;
    province?: string;
    district?: string;
    neighborhood?: string;
    lang?: "tr" | "en";
  };
  lang: "tr" | "en";
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-base font-semibold leading-tight sm:text-lg">
          {lang === "tr" ? "Proje İlanları ve Yapım İlanları" : "Project listings & construction listings"}
        </h3>
      </div>
      <HomeAuctionsVirtualGrid initialAuctions={initialAuctions} lang={lang} />
    </section>
  );
}
