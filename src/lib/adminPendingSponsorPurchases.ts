import type { PrismaClient } from "@/generated/prisma/client";

/** Yönetici sponsor onayı listesi — API ve RSC aynı seçimi kullanır. */
export function pendingSponsorPurchasesSelect() {
  return {
    id: true,
    periodDays: true,
    amountTryPaid: true,
    createdAt: true,
    paymentCreditTxId: true,
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        memberNumber: true,
        memberProfile: {
          select: {
            province: true,
            profession: { select: { name: true } },
          },
        },
      },
    },
  } as const;
}

export async function listPendingSponsorPurchaseRequests(prisma: PrismaClient) {
  return prisma.sponsorHeroPurchaseRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: pendingSponsorPurchasesSelect(),
  });
}
