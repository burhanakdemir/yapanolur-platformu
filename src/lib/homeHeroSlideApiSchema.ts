import { z } from "zod";

const slideLangSchema = z.enum(["tr", "en"]);

const sortOrderSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}, z.number().int().optional());

const optionalBool = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1 || val === "1") return true;
  if (val === "false" || val === 0 || val === "0") return false;
  return val;
}, z.boolean().optional());

export const homeHeroSlideCreateBodySchema = z.object({
  lang: slideLangSchema,
  sortOrder: sortOrderSchema,
  active: optionalBool,
  title: z.string().trim().min(1).max(500),
  subtitle: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  ctaUrl: z.string().max(2000).optional().nullable(),
  ctaLabel: z.string().max(200).optional().nullable(),
  isSponsor: optionalBool,
  startsAt: z.union([z.string(), z.null()]).optional(),
  endsAt: z.union([z.string(), z.null()]).optional(),
});

export const homeHeroSlidePatchBodySchema = homeHeroSlideCreateBodySchema.partial();

export function formatHomeHeroSlideZodError(parsed: { success: false; error: z.ZodError }): string {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "gövde"}: ${i.message}`);
  return issues.join("; ") || "Geçersiz istek gövdesi.";
}
