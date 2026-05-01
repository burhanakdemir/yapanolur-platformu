"use client";

import { COOKIE_CONSENT_CLIENT_COOKIE, COOKIE_CONSENT_STORAGE_KEY } from "@/lib/cookieConsent";

type Props = {
  lang: "tr" | "en";
};

export default function ResetCookiePreferencesButton({ lang }: Props) {
  return (
    <button
      type="button"
      className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-900 shadow-sm transition hover:bg-orange-50"
      onClick={() => {
        try {
          localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        document.cookie = `${COOKIE_CONSENT_CLIENT_COOKIE}=; path=/; max-age=0`;
        window.location.reload();
      }}
    >
      {lang === "tr" ? "Çerez tercihlerini sıfırla" : "Reset cookie preferences"}
    </button>
  );
}
