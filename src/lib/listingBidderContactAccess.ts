import type { PrismaClient } from "@/generated/prisma/client";

/** Görüntüleyen üye, hedef üyenin onaylı ilanlarından birine teklif verdiyse iletişim ücreti istenmez. */
export async function viewerHasBidOnOwnerApprovedAds(
  db: PrismaClient,
  viewerUserId: string,
  ownerUserId: string,
): Promise<boolean> {
  if (viewerUserId === ownerUserId) return false;
  const found = await db.bid.findFirst({
    where: {
      bidderId: viewerUserId,
      ad: {
        ownerId: ownerUserId,
        status: "APPROVED",
      },
    },
    select: { id: true },
  });
  return Boolean(found);
}
