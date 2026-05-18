export const HOME_HERO_TICKER_MODES = ["auto", "sponsors", "new_members"] as const;
export type HomeHeroTickerMode = (typeof HOME_HERO_TICKER_MODES)[number];

export type HomeHeroTickerDisplayKind = "sponsors" | "new_members";

export function parseHomeHeroTickerMode(raw: string | null | undefined): HomeHeroTickerMode {
  if (raw === "sponsors" || raw === "new_members" || raw === "auto") return raw;
  return "auto";
}

export function resolveHomeHeroTickerDisplay(
  mode: HomeHeroTickerMode,
  sponsorSlideCount: number,
): HomeHeroTickerDisplayKind {
  if (mode === "new_members") return "new_members";
  if (mode === "sponsors") return "sponsors";
  return sponsorSlideCount > 0 ? "sponsors" : "new_members";
}
