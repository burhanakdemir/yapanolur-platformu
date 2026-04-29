import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Yeni ilan e-postası (meslek + il eşleşmesi) gönderirken yalnızca bu listeyi kullanın.
 * `newAdEmailOptIn = false` olanlar **asla** dönmez — otomatik mail almazlar.
 */
export async function findUserIdsForNewAdEmailMatch(params: {
  professionId: string;
  /** İlan `province` alanı — üye `MemberProfile.province` ile aynı metin (trim) eşleşir */
  province: string;
  /** İlan sahibi */
  excludeUserId: string;
}): Promise<{ id: string; email: string }[]> {
  const prov = params.province.trim();
  const rows = await prisma.$queryRaw<{ id: string; email: string }[]>(Prisma.sql`
    SELECT u."id", u."email"
    FROM "User" u
    INNER JOIN "MemberProfile" mp ON mp."userId" = u."id"
    WHERE u."newAdEmailOptIn" = true
      AND u."role" = 'MEMBER'
      AND u."isMemberApproved" = true
      AND u."id" != ${params.excludeUserId}
      AND mp."professionId" = ${params.professionId}
      AND TRIM(COALESCE(mp."province", '')) = ${prov}
  `);
  return rows;
}
