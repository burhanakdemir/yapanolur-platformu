import type { PrismaClient } from "@/generated/prisma/client";
import type { Lang } from "@/lib/i18n";
import {
  fetchActiveHomeHeroSlides,
  toHomeHeroSlidePayload,
  type HomeHeroSlideClientPayload,
} from "@/lib/homeHeroSlidesQuery";
import {
  parseHomeHeroTickerMode,
  resolveHomeHeroTickerDisplay,
  type HomeHeroTickerDisplayKind,
} from "@/lib/homeHeroTickerMode";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL_SUFFIXES = ["@ornek-demo.local", "@seed-gercek.local"] as const;

export type HomeHeroTickerResult = {
  slides: HomeHeroSlideClientPayload[];
  displayKind: HomeHeroTickerDisplayKind;
  mode: ReturnType<typeof parseHomeHeroTickerMode>;
};

function buildDemoEmailFilter() {
  return {
    NOT: {
      OR: DEMO_EMAIL_SUFFIXES.map((suffix) => ({
        email: { endsWith: suffix },
      })),
    },
  };
}

async function fetchRecentMemberTickerSlides(
  client: Pick<PrismaClient, "user">,
  limit: number,
): Promise<HomeHeroSlideClientPayload[]> {
  const capped = Math.max(1, Math.min(48, limit));
  const rows = await client.user.findMany({
    where: {
      role: "MEMBER",
      isMemberApproved: true,
      ...buildDemoEmailFilter(),
    },
    orderBy: { createdAt: "desc" },
    take: capped,
    select: {
      id: true,
      name: true,
      memberNumber: true,
      memberProfile: {
        select: {
          province: true,
          profession: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((u) => {
    const title = u.name?.trim() || `Üye ${u.memberNumber}`;
    const subtitleParts = [u.memberProfile?.profession?.name, u.memberProfile?.province].filter(
      (x): x is string => Boolean(x?.trim()),
    );
    return {
      id: `member-ticker-${u.id}`,
      title,
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : null,
      imageUrl: null,
      ctaUrl: `/uye/${u.id}`,
      ctaLabel: null,
      isSponsor: false,
    };
  });
}

export async function fetchHomeHeroTickerSlides(
  lang: Lang,
  settings?: {
    homeHeroTickerMode?: string | null;
    homeHeroNewMembersLimit?: number | null;
  } | null,
): Promise<HomeHeroTickerResult> {
  let row = settings;
  if (!row) {
    try {
      row = await prisma.adminSettings.findUnique({
        where: { id: "singleton" },
        select: { homeHeroTickerMode: true, homeHeroNewMembersLimit: true },
      });
    } catch {
      row = null;
    }
  }

  const mode = parseHomeHeroTickerMode(row?.homeHeroTickerMode);
  const memberLimit = row?.homeHeroNewMembersLimit ?? 24;

  const sponsorRaw = await fetchActiveHomeHeroSlides(lang);
  const sponsorSlides = toHomeHeroSlidePayload(sponsorRaw);
  const displayKind = resolveHomeHeroTickerDisplay(mode, sponsorSlides.length);

  if (displayKind === "sponsors") {
    return { slides: sponsorSlides, displayKind, mode };
  }

  const memberSlides = await fetchRecentMemberTickerSlides(prisma, memberLimit);
  return { slides: memberSlides, displayKind: "new_members", mode };
}
