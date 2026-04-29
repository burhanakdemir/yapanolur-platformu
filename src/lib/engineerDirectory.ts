import type { PrismaClient } from "@/generated/prisma/client";

export type PublicEngineerRow = {
  id: string;
  memberNumber: number;
  name: string | null;
  profilePhotoUrl: string | null;
  province: string | null;
  district: string | null;
  profession: { id: string; name: string } | null;
};

/**
 * Onaylı üyeler: il / ilçe / meslek (en az biri dolu olmalı).
 * Konum alanları üye profilinde kayıtlı metinle birebir eşleşir (konum API adları).
 */
export async function findPublicEngineers(
  prisma: PrismaClient,
  filters: { province?: string; district?: string; professionId?: string },
): Promise<PublicEngineerRow[]> {
  const prov = filters.province?.trim();
  const dist = filters.district?.trim();
  const prof = filters.professionId?.trim();

  if (!prov && !dist && !prof) return [];

  const rows = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      isMemberApproved: true,
      memberProfile: {
        is: {
          ...(prof ? { professionId: prof } : {}),
          ...(prov ? { province: prov } : {}),
          ...(dist ? { district: dist } : {}),
        },
      },
    },
    orderBy: { memberNumber: "asc" },
    take: 80,
    select: {
      id: true,
      memberNumber: true,
      name: true,
      profilePhotoUrl: true,
      memberProfile: {
        select: {
          province: true,
          district: true,
          profession: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    memberNumber: r.memberNumber,
    name: r.name,
    profilePhotoUrl: r.profilePhotoUrl,
    province: r.memberProfile?.province ?? null,
    district: r.memberProfile?.district ?? null,
    profession: r.memberProfile?.profession ?? null,
  }));
}
