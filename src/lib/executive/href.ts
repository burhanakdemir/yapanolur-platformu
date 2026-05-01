import type { ExecutivePeriod } from "@/lib/executive/istanbulCalendar";

export function executiveDashboardHref(
  period: ExecutivePeriod,
  trend: 30 | 90,
  opts?: { from?: string | null },
): string {
  const p = new URLSearchParams();
  if (period === "custom" && opts?.from) {
    p.set("period", "custom");
    p.set("from", opts.from);
    return `/executive?${p.toString()}`;
  }
  if (period !== "month") p.set("period", period);
  if (trend !== 30) p.set("trend", String(trend));
  const q = p.toString();
  return `/executive${q ? `?${q}` : ""}`;
}
