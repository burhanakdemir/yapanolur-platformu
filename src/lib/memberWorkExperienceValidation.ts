import { z } from "zod";
import { isAllowedUploadUrl } from "@/lib/uploadUrl";

const WORK_TITLE_MAX = 200;
const WORK_DESCRIPTION_MAX = 2000;
const WORK_BLOCK_PARCEL_MAX = 120;

const MAX_DURATION_YEARS = 50;
const MAX_DURATION_MONTHS = 11;
const MAX_DURATION_DAYS = 9999;

const imageUrlSchema = z.string().refine((u) => isAllowedUploadUrl(u), "Gecersiz gorsel adresi.");

const baseFields = {
  title: z.string().trim().min(1, "Is adi gerekli.").max(WORK_TITLE_MAX),
  description: z.string().trim().min(1, "Tanim gerekli.").max(WORK_DESCRIPTION_MAX),
  province: z.string().trim().min(1, "Il secin."),
  district: z.string().trim().min(1, "Ilce secin."),
  blockParcel: z
    .union([z.string().trim().max(WORK_BLOCK_PARCEL_MAX), z.literal("")])
    .optional()
    .transform((s) => (s === "" || s === undefined ? null : s)),
  durationYears: z.coerce.number().int().min(0).max(MAX_DURATION_YEARS),
  durationMonths: z.coerce.number().int().min(0).max(MAX_DURATION_MONTHS),
  durationDays: z.coerce.number().int().min(0).max(MAX_DURATION_DAYS),
  professionId: z.string().trim().min(1, "Meslek secin."),
  categoryId: z.string().trim().min(1, "Kategori secin."),
  imageUrls: z.array(imageUrlSchema).max(3).optional(),
};

const memberWorkExperienceCreateSchema = z
  .object(baseFields)
  .superRefine((data, ctx) => {
    if (data.durationYears === 0 && data.durationMonths === 0 && data.durationDays === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitis suresi icin en az yil, ay veya gun girin.",
        path: ["durationDays"],
      });
    }
  });

export function normalizeImageSlots(urls: string[] | undefined): [string | null, string | null, string | null] {
  const u = (urls ?? []).filter(Boolean).slice(0, 3);
  return [u[0] ?? null, u[1] ?? null, u[2] ?? null];
}

export function parseMemberWorkExperienceBody(raw: unknown) {
  return memberWorkExperienceCreateSchema.safeParse(raw);
}
