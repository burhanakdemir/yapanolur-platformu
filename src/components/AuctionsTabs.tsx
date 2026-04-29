"use client";

import { useCallback, useState } from "react";
import AdAccessModal from "@/components/AdAccessModal";
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
  const [accessModalAdId, setAccessModalAdId] = useState<string | null>(null);

  const onOpenCard = useCallback((id: string) => {
    setAccessModalAdId(id);
  }, []);

  const onCloseModal = useCallback(() => {
    setAccessModalAdId(null);
  }, []);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-base font-semibold leading-tight sm:text-lg">
          {lang === "tr" ? "Proje İlanları ve Yapım İlanları" : "Project listings & construction listings"}
        </h3>
      </div>
      <HomeAuctionsVirtualGrid initialAuctions={initialAuctions} lang={lang} onOpenCard={onOpenCard} />
      <AdAccessModal
        adId={accessModalAdId}
        open={accessModalAdId !== null}
        onClose={onCloseModal}
        lang={lang}
      />
    </section>
  );
}
