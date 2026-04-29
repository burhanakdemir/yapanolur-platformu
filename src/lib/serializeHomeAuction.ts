import type { CategoryWithAncestors } from "@/lib/categoryCardLabels";
import { getCategoryCardLabels } from "@/lib/categoryCardLabels";

/** `findManyAuctionsShowcaseFirst` + tarih + kart etiketleri (istemci güvenli). */
export function serializeAuctionForHomeList<
  T extends {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    showcaseUntil: Date | null;
    province: string;
    district: string;
    neighborhood: string;
    startingPriceTry: number;
    auctionEndsAt: Date | null;
    category: CategoryWithAncestors;
  },
>(a: T) {
  const categoryCard = getCategoryCardLabels(a.category);
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    showcaseUntil: a.showcaseUntil?.toISOString() ?? null,
    province: a.province,
    district: a.district,
    neighborhood: a.neighborhood,
    startingPriceTry: a.startingPriceTry,
    auctionEndsAt: a.auctionEndsAt?.toISOString() ?? null,
    categoryCard,
  };
}
