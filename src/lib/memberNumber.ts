import { Prisma } from "@/generated/prisma/client";

export const MEMBER_NUMBER_MIN = 124;
export const MEMBER_NUMBER_MAX = 99_999_999;

/**
 * Son uye numarasini bulur. Prisma istemcisi `memberNumber` alanini tanimas
 * (eski generate) aggregate/orderBy'da hata verebildigi icin ham SQL kullanilir.
 */
export async function nextMemberNumber(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ max: number | bigint | null }>>(
    Prisma.sql`SELECT MAX("memberNumber") AS max FROM "User"`,
  );
  const raw = rows[0]?.max;
  const max = raw == null ? null : Number(raw);
  const next = (max ?? MEMBER_NUMBER_MIN - 1) + 1;
  if (next > MEMBER_NUMBER_MAX) {
    throw new Error("Uye kayit numarasi limiti doldu (99999999).");
  }
  return next;
}
