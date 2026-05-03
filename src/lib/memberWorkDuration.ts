/**
 * Bitiş süresi metni — sıfır olan birimler yazılmaz.
 * Sıra: yıl, ay, gün (hepsi pozitifse hepsi; sadece gün varsa ör. "20 gün").
 */
export function formatMemberWorkDuration(
  lang: "tr" | "en",
  years: number,
  months: number,
  days: number,
): string {
  const y = Math.max(0, Math.floor(Number(years)) || 0);
  const m = Math.max(0, Math.floor(Number(months)) || 0);
  const d = Math.max(0, Math.floor(Number(days)) || 0);
  if (y === 0 && m === 0 && d === 0) {
    return "—";
  }
  const parts: string[] = [];
  if (lang === "tr") {
    if (y > 0) parts.push(`${y} yıl`);
    if (m > 0) parts.push(`${m} ay`);
    if (d > 0) parts.push(`${d} gün`);
  } else {
    if (y > 0) parts.push(`${y} ${y === 1 ? "year" : "years"}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? "month" : "months"}`);
    if (d > 0) parts.push(`${d} ${d === 1 ? "day" : "days"}`);
  }
  return parts.join(" ");
}
