import type { Prisma } from "@/generated/prisma/client";

type SponsorHeroMemberFields = {
  userId: string;
  memberNumber: number;
  name: string | null;
  professionName: string | null;
  province: string | null;
};

/** TR sponsor slaytı: mevcut sponsor satırlarını silip yenisi oluşturur (transaction içinde). */
export async function createSponsorHeroSlideForMemberTx(
  tx: Prisma.TransactionClient,
  member: SponsorHeroMemberFields,
  periodDays: number,
) {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const titleBase = member.name?.trim() || `Üye ${member.memberNumber}`;
  const subtitleParts = [member.professionName, member.province].filter(
    (x): x is string => Boolean(x?.trim()),
  );
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : null;

  await tx.homeHeroSlide.deleteMany({ where: { sponsorUserId: member.userId } });

  const maxTr = await tx.homeHeroSlide.aggregate({
    where: { lang: "tr" },
    _max: { sortOrder: true },
  });
  const sortTr = (maxTr._max.sortOrder ?? -1) + 1;

  return tx.homeHeroSlide.create({
    data: {
      lang: "tr",
      sortOrder: sortTr,
      active: true,
      title: titleBase,
      subtitle,
      imageUrl: null,
      ctaUrl: `/uye/${member.userId}`,
      ctaLabel: "Profil",
      isSponsor: true,
      sponsorUserId: member.userId,
      startsAt,
      endsAt,
    },
  });
}
