import type { AdminSettings } from "@/generated/prisma/client";

/** Ana sayfa sponsorluğu — üye paneli ve süper admin fiyatlandırma (gün → TL, tamsayı). */
export const SPONSOR_HERO_DURATION_DAYS = [4, 7, 10, 15, 30] as const;

export type SponsorHeroDurationDays = (typeof SPONSOR_HERO_DURATION_DAYS)[number];

export type SponsorHeroPricingTry = Record<`${SponsorHeroDurationDays}`, number>;

const DAY_SET = new Set<number>(SPONSOR_HERO_DURATION_DAYS);

export function isSponsorHeroDurationDays(n: number): n is SponsorHeroDurationDays {
  return DAY_SET.has(n as SponsorHeroDurationDays);
}

function asDayKey(d: SponsorHeroDurationDays): `${SponsorHeroDurationDays}` {
  return String(d) as `${SponsorHeroDurationDays}`;
}

/** DB + geriye dönük tek ücret alanından tam 5 gün için tablo. */
export function mergeSponsorHeroPricingFromDb(
  s: Pick<AdminSettings, "sponsorHeroPricingTryJson" | "sponsorHeroFeeAmountTry">,
): SponsorHeroPricingTry {
  const fallback = Math.max(0, Math.trunc(s.sponsorHeroFeeAmountTry ?? 0));
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(s.sponsorHeroPricingTryJson || "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const out = {} as SponsorHeroPricingTry;
  for (const d of SPONSOR_HERO_DURATION_DAYS) {
    const k = asDayKey(d);
    const raw = parsed[k] ?? parsed[String(d)];
    const n = typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : fallback;
    out[k] = Math.max(0, n);
  }
  return out;
}

export function pricingTryToJson(pricing: SponsorHeroPricingTry): string {
  const ordered: SponsorHeroPricingTry = {} as SponsorHeroPricingTry;
  for (const d of SPONSOR_HERO_DURATION_DAYS) {
    const k = asDayKey(d);
    ordered[k] = Math.max(0, Math.trunc(pricing[k] ?? 0));
  }
  return JSON.stringify(ordered);
}
