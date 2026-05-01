/**
 * Tarih dilimi: Europe/Istanbul (TRT, yıl boyu UTC+3).
 * Takvim günü aritmetiği üye işi özetleri için yeterli; sınır saatlerinde ±1 gün sapması kabul edilebilir.
 */

/** Anlık takvim günü YYYY-MM-DD (İstanbul). */
export function istYmdNow(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** ISO hafta günü: Pazartesi=1 … Pazar=7 (İstanbul takvimine göre). */
export function istIsoWeekdayMon1Sun7(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const inst = new Date(Date.UTC(y, m - 1, d, 12 - 3, 0, 0, 0));
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(inst);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const key = short.slice(0, 3) as keyof typeof map;
  return map[key] ?? 1;
}

export function addCalendarDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(t);
}

/** İstanbul YYYY-MM-DD gece yarısının UTC karşılığı (TRT +3). */
export function istMidnightUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
}

/** Haftanın Pazartesi günü (aynı ISO hafta, İstanbul). */
export function istMondayOfWeekContaining(ymd: string): string {
  const wd = istIsoWeekdayMon1Sun7(ymd);
  return addCalendarDaysYmd(ymd, -(wd - 1));
}

/** Ayın ilk günü YYYY-MM-DD (İstanbul). */
export function istFirstDayOfMonth(ymd: string): string {
  const y = ymd.slice(0, 4);
  const m = ymd.slice(5, 7);
  return `${y}-${m}-01`;
}

/** Sonraki ayın ilk günü YYYY-MM-DD (üst sınır exclusive için). */
export function istFirstDayOfNextMonth(ymd: string): string {
  const y = Number(ymd.slice(0, 4));
  const mo = Number(ymd.slice(5, 7));
  const nextFirst = new Date(Date.UTC(y, mo, 1));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nextFirst);
}

export type ExecutivePeriod = "today" | "week" | "month";

export function parseExecutivePeriod(v: string | undefined): ExecutivePeriod {
  if (v === "today" || v === "week" || v === "month") return v;
  return "month";
}

export function parseTrendWindow(v: string | undefined): 30 | 90 {
  if (v === "90") return 90;
  return 30;
}

export type IstRange = { start: Date; endExclusive: Date; label: string };

export function rangeForPeriod(period: ExecutivePeriod, now = new Date()): IstRange {
  const today = istYmdNow(now);
  if (period === "today") {
    const start = istMidnightUtc(today);
    const endExclusive = istMidnightUtc(addCalendarDaysYmd(today, 1));
    return { start, endExclusive, label: "Bugün" };
  }
  if (period === "week") {
    const mon = istMondayOfWeekContaining(today);
    const start = istMidnightUtc(mon);
    const endExclusive = istMidnightUtc(addCalendarDaysYmd(mon, 7));
    return { start, endExclusive, label: "Bu hafta" };
  }
  const first = istFirstDayOfMonth(today);
  const nextFirst = istFirstDayOfNextMonth(first);
  return {
    start: istMidnightUtc(first),
    endExclusive: istMidnightUtc(nextFirst),
    label: "Bu ay",
  };
}

/** Trend serisi: bugünden geriye N gün [start, now] — son gün dahil. */
export function trendRangeDays(window: 30 | 90, now = new Date()): { start: Date; endExclusive: Date } {
  const today = istYmdNow(now);
  const start = istMidnightUtc(addCalendarDaysYmd(today, -(window - 1)));
  const endExclusive = istMidnightUtc(addCalendarDaysYmd(today, 1));
  return { start, endExclusive };
}

