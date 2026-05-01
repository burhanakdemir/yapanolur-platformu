/**
 * Çerez / izleme tercihi — tarayıcı localStorage + isteğe bağlı first-party çerez (sunucu uyumu için).
 * Yasal metin: `/cerez-politikasi`, KVKK çapraz gönderim.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "yapanolur_cookie_consent_v1";

/** İstemci tarafında isteğe bağlı betikler için (ör. Sentry SDK). */
export const COOKIE_CONSENT_CLIENT_COOKIE = "cookie_consent_choice";

export type CookieConsentChoice = "essential" | "full";

export type CookieConsentRecord = {
  v: 1;
  choice: CookieConsentChoice;
  updatedAt: string;
};

export function parseCookieConsent(raw: string | null): CookieConsentRecord | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return null;
    const o = j as Record<string, unknown>;
    if (o.v !== 1) return null;
    if (o.choice !== "essential" && o.choice !== "full") return null;
    if (typeof o.updatedAt !== "string") return null;
    return { v: 1, choice: o.choice, updatedAt: o.updatedAt };
  } catch {
    return null;
  }
}

export function shouldLoadOptionalClientMonitoring(record: CookieConsentRecord | null): boolean {
  return record?.choice === "full";
}
