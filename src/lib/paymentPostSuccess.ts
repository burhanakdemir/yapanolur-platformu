import { prisma } from "@/lib/prisma";
import { isShowcaseDay } from "@/lib/showcaseDurations";

export async function activateShowcaseAfterPayment(params: { userId: string; adId: string; days: number }) {
  const ad = await prisma.ad.findUnique({
    where: { id: params.adId },
    select: { id: true, ownerId: true },
  });
  if (!ad || ad.ownerId !== params.userId) return;

  const settings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  let fee = settings.showcaseFeeAmountTry * params.days;
  try {
    const map = JSON.parse(settings.showcaseDailyPricingJson || "{}") as Record<string, number>;
    const mapped = map[String(params.days)];
    if (Number.isFinite(mapped)) fee = Number(mapped);
  } catch {
    /* ignore */
  }

  if (fee > 0) {
    await prisma.creditTransaction.create({
      data: {
        userId: params.userId,
        type: "AD_FEE",
        amountTry: -fee,
        description: `Vitrin ucreti (${params.adId})`,
        referenceId: params.adId,
      },
    });
  }

  await prisma.ad.update({
    where: { id: params.adId },
    data: {
      showcaseUntil: new Date(Date.now() + params.days * 24 * 60 * 60 * 1000),
    },
  });
}

export function parseShowcaseFromCallback(
  q: { reason?: string | null; adId?: string | null; days?: string | null } | null | undefined,
): { ok: true; adId: string; days: number } | { ok: false } {
  if (!q || q.reason !== "showcase" || !q.adId) return { ok: false };
  const days = Number(q.days || 0);
  if (!isShowcaseDay(days)) return { ok: false };
  return { ok: true, adId: q.adId, days };
}
