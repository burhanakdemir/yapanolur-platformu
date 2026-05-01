import type { ExecutivePeriod } from "@/lib/executive/istanbulCalendar";

export function executiveDashboardHref(period: ExecutivePeriod, trend: 30 | 90): string {
  const p = new URLSearchParams();
  if (period !== "month") p.set("period", period);
  if (trend !== 30) p.set("trend", String(trend));
  const q = p.toString();
  return `/executive${q ? `?${q}` : ""}`;
}
