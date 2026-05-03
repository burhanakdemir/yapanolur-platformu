import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Tam sayi (yalnizca rakamlar); aralik 234–99999999. */
const LISTING_NUMBER_MIN = 234;
const LISTING_NUMBER_MAX = 99_999_999;

/**
 * Yeni ilan: mevcut en buyuk listingNumber + 1 (bos tabloda 234).
 * Gecmis veriler migrate ile tek sira haline getirilir; uygulama toplu degistirmez.
 */
async function nextListingNumber(tx: Prisma.TransactionClient): Promise<number> {
  const last = await tx.ad.findFirst({
    orderBy: { listingNumber: "desc" },
    select: { listingNumber: true },
  });
  const next = (last?.listingNumber ?? LISTING_NUMBER_MIN - 1) + 1;
  if (next > LISTING_NUMBER_MAX) {
    throw new Error("Ilan numarasi limiti doldu (99999999).");
  }
  return next;
}

export async function createAdWithListingNumber(
  prisma: PrismaClient,
  data: Omit<Prisma.AdCreateInput, "listingNumber">,
): Promise<{ id: string; listingNumber: number }> {
  return prisma.$transaction(async (tx) => {
    const listingNumber = await nextListingNumber(tx);
    const ad = await tx.ad.create({
      data: { ...data, listingNumber },
      select: { id: true, listingNumber: true },
    });
    return ad;
  });
}
