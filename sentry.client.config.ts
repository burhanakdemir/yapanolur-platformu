import * as Sentry from "@sentry/nextjs";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  shouldLoadOptionalClientMonitoring,
  type CookieConsentRecord,
} from "@/lib/cookieConsent";

let sentryInitialized = false;

/**
 * İstemci Sentry SDK — yalnızca kullanıcı “Tümünü kabul et” (`full`) seçtiyse başlatılır.
 * Sunucu tarafı `sentry.server.config` etkilenmez.
 */
export function initSentryClientFromConsent(): void {
  if (typeof window === "undefined" || sentryInitialized) return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  let record: CookieConsentRecord | null = null;
  try {
    record = parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    record = null;
  }
  if (!shouldLoadOptionalClientMonitoring(record)) return;

  Sentry.init({
    dsn,
    tracesSampleRate: Math.min(1, Math.max(0, Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0))),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });
  sentryInitialized = true;
}

/** Modül yüklendiğinde: daha önce kayıtlı tam rıza varsa Sentry’yi başlat. */
initSentryClientFromConsent();
