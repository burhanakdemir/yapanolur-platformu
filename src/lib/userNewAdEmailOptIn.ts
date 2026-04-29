import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * `newAdEmailOptIn` alanı bazı ortamlarda `prisma generate` / migration atlanınca
 * Prisma DMMF'da olmayabiliyor. Model API yerine ham SQL — istemci sürümüne bağlı
 * "Unknown field" hatalarını önler (sütun yoksa false).
 */
export async function getUserNewAdEmailOptIn(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ newAdEmailOptIn: boolean }[]>(
      Prisma.sql`SELECT "newAdEmailOptIn" FROM "User" WHERE "id" = ${userId} LIMIT 1`,
    );
    return Boolean(rows[0]?.newAdEmailOptIn);
  } catch (e) {
    console.warn("[getUserNewAdEmailOptIn]", e);
    return false;
  }
}

export async function setUserNewAdEmailOptIn(userId: string, value: boolean): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "User" SET "newAdEmailOptIn" = ${value}, "updatedAt" = NOW() WHERE "id" = ${userId}`,
  );
}
