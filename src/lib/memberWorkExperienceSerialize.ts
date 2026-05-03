import { formatMemberWorkDuration } from "@/lib/memberWorkDuration";

/** API yanıtı: iş deneyimi + ilişkili meslek / kategori adları */
export function serializeMemberWorkExperienceApi(r: {
  id: string;
  title: string;
  description: string;
  province: string;
  district: string;
  blockParcel: string | null;
  durationYears: number;
  durationMonths: number;
  durationDays: number;
  professionId: string | null;
  categoryId: string | null;
  imageUrl1: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  createdAt: Date;
  updatedAt: Date;
  profession: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    province: r.province,
    district: r.district,
    blockParcel: r.blockParcel,
    durationYears: r.durationYears,
    durationMonths: r.durationMonths,
    durationDays: r.durationDays,
    durationLabelTr: formatMemberWorkDuration("tr", r.durationYears, r.durationMonths, r.durationDays),
    durationLabelEn: formatMemberWorkDuration("en", r.durationYears, r.durationMonths, r.durationDays),
    professionId: r.professionId,
    professionName: r.profession?.name ?? null,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    imageUrls: [r.imageUrl1, r.imageUrl2, r.imageUrl3].filter(Boolean) as string[],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const MEMBER_WORK_EXPERIENCE_INCLUDE = {
  profession: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} as const;
