import type { HomeHeroSlide } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";
import { collectErrorChainText } from "@/lib/dbErrors";

/** Migration henüz uygulanmamış veya tablo eksikse ana sayfa kırılmasın (hero site ayarına düşer). */
function isRecoverableHeroSlidesDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    /** P2021 tablo yok · P2022 kolon yok */
    if (error.code === "P2021" || error.code === "P2022") return true;
  }
  const text = collectErrorChainText(error);
  if (/HomeHeroSlide/i.test(text) && /does not exist|42P01|undefined_table|Unknown model/i.test(text)) {
    return true;
  }
  return false;
}

/** Aktif hero satırları (ana sayfa sponsor dahil); tam `HomeHeroSlide` yerine görünüm alanları. */
export async function fetchActiveHomeHeroSlides(
  lang: Lang,
  now = new Date(),
): Promise<
  Pick<
    HomeHeroSlide,
    | "id"
    | "lang"
    | "sortOrder"
    | "active"
    | "title"
    | "subtitle"
    | "imageUrl"
    | "ctaUrl"
    | "ctaLabel"
    | "isSponsor"
    | "startsAt"
    | "endsAt"
    | "createdAt"
    | "updatedAt"
  >[]
> {
  const slideLang = lang === "en" ? "en" : "tr";
  const delegate = prisma.homeHeroSlide;
  if (!delegate?.findMany) {
    console.warn(
      "[fetchActiveHomeHeroSlides] prisma.homeHeroSlide kullanılamıyor; `npx prisma generate` ve dev sunucusunu yeniden başlatın. Boş slayt listesi.",
    );
    return [];
  }
  try {
    /** Yalnızca görünüm için alanlar — isteğe bağlı `sponsorUserId` vb. şema uyumsuzluğunda okuma yolu daha dayanıklı. */
    return await delegate.findMany({
      where: {
        lang: slideLang,
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      select: {
        id: true,
        lang: true,
        sortOrder: true,
        active: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        ctaUrl: true,
        ctaLabel: true,
        isSponsor: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (e) {
    if (isRecoverableHeroSlidesDbError(e)) {
      console.warn("[fetchActiveHomeHeroSlides] Hero tablosu/şema eksik veya uyumsuz; boş slayt listesi kullanılıyor.", e);
      return [];
    }
    throw e;
  }
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

export function toHomeHeroSlidePayload(
  slides: Pick<
    HomeHeroSlide,
    "id" | "title" | "subtitle" | "imageUrl" | "ctaUrl" | "ctaLabel" | "isSponsor"
  >[],
): HomeHeroSlideClientPayload[] {
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
