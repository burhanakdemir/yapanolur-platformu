export type DashboardRange = "today" | "7d" | "30d";

export function getDashboardRange(value?: string): DashboardRange {
  if (value === "today" || value === "7d" || value === "30d") return value;
  return "7d";
}

export function getRangeStart(range: DashboardRange) {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** YYYY-MM-DD (yerel takvim) */
export function parseYmd(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type DashboardDateRangeResult = {
  since: Date;
  until: Date;
  fromIso: string;
  toIso: string;
  /** URL'de geçerli from+to yokken (varsayılan: son 30 gün) */
  usedDefaultRange: boolean;
};

function defaultLast30DaysRange(): DashboardDateRangeResult {
  const now = new Date();
  const until = endOfDayLocal(now);
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);
  return {
    since,
    until,
    fromIso: formatYmdLocal(since),
    toIso: formatYmdLocal(until),
    usedDefaultRange: true,
  };
}

/**
 * Panel özet: `from` ve `to` query (YYYY-MM-DD). İkisi de geçerli değilse son 30 gün.
 */
export function resolveDashboardDateRange(
  fromParam?: string,
  toParam?: string,
): DashboardDateRangeResult {
  const fromD = parseYmd(fromParam);
  const toD = parseYmd(toParam);
  if (!fromD || !toD) {
    return defaultLast30DaysRange();
  }
  let start = startOfDayLocal(fromD);
  let end = endOfDayLocal(toD);
  if (start > end) {
    start = startOfDayLocal(toD);
    end = endOfDayLocal(fromD);
  }
  const todayEnd = endOfDayLocal(new Date());
  if (end > todayEnd) end = todayEnd;
  if (start > end) start = startOfDayLocal(end);
  return {
    since: start,
    until: end,
    fromIso: formatYmdLocal(start),
    toIso: formatYmdLocal(end),
    usedDefaultRange: false,
  };
}
