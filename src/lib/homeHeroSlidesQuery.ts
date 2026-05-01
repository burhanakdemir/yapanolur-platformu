import type { HomeHeroSlide } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

export async function fetchActiveHomeHeroSlides(lang: Lang, now = new Date()): Promise<HomeHeroSlide[]> {
  const slideLang = lang === "en" ? "en" : "tr";
  return prisma.homeHeroSlide.findMany({
    where: {
      lang: slideLang,
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export type HomeHeroSlideClientPayload = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  isSponsor: boolean;
};

export function toHomeHeroSlidePayload(slides: HomeHeroSlide[]): HomeHeroSlideClientPayload[] {
  return slides.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    imageUrl: s.imageUrl,
    ctaUrl: s.ctaUrl,
    ctaLabel: s.ctaLabel,
    isSponsor: s.isSponsor,
  }));
}
