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
function istIsoWeekdayMon1Sun7(ymd: string): number {
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
function istMidnightUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
}

/** Haftanın Pazartesi günü (aynı ISO hafta, İstanbul). */
function istMondayOfWeekContaining(ymd: string): string {
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
function istFirstDayOfNextMonth(ymd: string): string {
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

export type ExecutivePeriod = "today" | "week" | "month" | "custom";

/** Günlük trendde üst sınır; daha uzun aralıkta aylık gruplama kullanılır. */
export const EXEC_MAX_DAILY_TREND_BUCKETS = 180;

/** Özel dönem: başlangıç–bitiş dahil en fazla bu kadar gün (İstanbul takvimi). */
export const EXEC_MAX_CUSTOM_RANGE_DAYS = 365;

export function parseExecutivePeriod(v: string | undefined): ExecutivePeriod {
  if (v === "today" || v === "week" || v === "month" || v === "custom") return v;
  return "month";
}

/** İki İstanbul günü arası (her iki uç dahil) gün sayısı. */
export function istCalendarDaysInclusive(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const t0 = Date.UTC(y1, m1 - 1, d1);
  const t1 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t1 - t0) / 86400000) + 1;
}

/** [fromYmd, toYmd] kapsayan her ay YYYY-MM (İstanbul). */
export function eachMonthYmInRange(fromYmd: string, toYmd: string): string[] {
  const startY = Number(fromYmd.slice(0, 4));
  const startM = Number(fromYmd.slice(5, 7));
  const endY = Number(toYmd.slice(0, 4));
  const endM = Number(toYmd.slice(5, 7));
  const out: string[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** [fromYmd, toYmd] her gün (dahil). */
export function eachDayYmdInRange(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    out.push(cur);
    cur = addCalendarDaysYmd(cur, 1);
  }
  return out;
}

/**
 * Özel özet/trend aralığı: başlangıç ve bitiş (İstanbul, her iki uç dahil).
 * Bitiş bugünü aşamaz; aralık uzunluğu en fazla EXEC_MAX_CUSTOM_RANGE_DAYS gün.
 */
export function rangeCustomFromTo(
  fromYmd: string,
  toYmd: string,
  now = new Date(),
): IstRange | null {
  const today = istYmdNow(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(toYmd)) return null;
  if (fromYmd > toYmd) return null;
  if (toYmd > today || fromYmd > today) return null;
  const span = istCalendarDaysInclusive(fromYmd, toYmd);
  if (span > EXEC_MAX_CUSTOM_RANGE_DAYS) return null;
  const start = istMidnightUtc(fromYmd);
  const endExclusive = istMidnightUtc(addCalendarDaysYmd(toYmd, 1));
  if (start.getTime() >= endExclusive.getTime()) return null;
  return {
    start,
    endExclusive,
    label: `${fromYmd} → ${toYmd}`,
  };
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

