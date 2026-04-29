import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function sumUserCreditTry(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ s: number | bigint | null }>>(
    Prisma.sql`SELECT COALESCE(SUM("amountTry"), 0) AS s FROM "CreditTransaction" WHERE "userId" = ${userId}`,
  );
  const v = rows[0]?.s;
  return v == null ? 0 : Number(v);
}
