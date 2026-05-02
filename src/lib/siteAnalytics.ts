import { randomUUID } from "crypto";

/** HttpOnly çerez — günlük benzersiz sayım ve anlık varlık için anonim anahtar. */
export const SITE_VISITOR_COOKIE = "yo_vid";

/** Varsayılan: son 3 dakika içinde ping atan tarayıcılar “anlık ziyaretçi”. */
const DEFAULT_ACTIVE_MS = 3 * 60 * 1000;

export function getSiteAnalyticsActiveMs(): number {
  const raw = process.env.SITE_ANALYTICS_ACTIVE_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 60_000 && n <= 600_000) {
    return Math.floor(n);
  }
  return DEFAULT_ACTIVE_MS;
}

/** `crypto.randomUUID()` ile uyumlu (v4). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeVisitorKey(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s || s.length > 64) return null;
  if (!UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

export function newVisitorKey(): string {
  return randomUUID();
}

/** Basit bot / crawler süzgeci — ping sayılmaz. */
export function isLikelyAutomatedUserAgent(ua: string | null): boolean {
  if (!ua || ua.length < 10) return true;
  const u = ua.toLowerCase();
  if (u.includes("googlebot") || u.includes("bingbot")) return true;
  if (u.includes("facebookexternalhit") || u.includes("slackbot")) return true;
  if (u.includes("preview") && u.includes("linkedin")) return true;
  if (u.includes("headlesschrome") || u.includes("phantom")) return true;
  if (u.startsWith("curl/") || u.startsWith("wget/")) return true;
  if (u.includes("lighthouse") || u.includes("pagespeed")) return true;
  return false;
}
