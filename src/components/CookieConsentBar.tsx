"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COOKIE_CONSENT_CLIENT_COOKIE,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  type CookieConsentChoice,
  type CookieConsentRecord,
} from "@/lib/cookieConsent";
import { getLang } from "@/lib/i18n";
import { initSentryClientFromConsent } from "../../sentry.client.config";

function consentCookieAttrs(maxAgeSec: number): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `path=/; SameSite=Lax; max-age=${maxAgeSec}${secure}`;
}

function setConsentCookie(choice: CookieConsentChoice): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_CONSENT_CLIENT_COOKIE}=${choice}; ${consentCookieAttrs(60 * 60 * 24 * 400)}`;
}

function saveConsent(choice: CookieConsentChoice): CookieConsentRecord {
  const rec: CookieConsentRecord = {
    v: 1,
    choice,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(rec));
  setConsentCookie(choice);
  return rec;
}

function hideBannerPadding(): void {
  document.body.style.paddingBottom = "";
}

function showBannerPadding(): void {
  document.body.style.paddingBottom = "clamp(5.5rem, 22vw, 8rem)";
}

export default function CookieConsentBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang") ?? undefined);

  const [visible, setVisible] = useState(false);

  const hideChrome =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/panel/admin") ||
    pathname === "/g/yonetici";

  useEffect(() => {
    if (hideChrome) return;
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const existing = parseCookieConsent(raw);
    if (existing) {
      hideBannerPadding();
      initSentryClientFromConsent();
      return;
    }
    setVisible(true);
    showBannerPadding();
    return () => {
      hideBannerPadding();
    };
  }, [hideChrome]);

  const acceptChoice = (choice: CookieConsentChoice) => {
    saveConsent(choice);
    setVisible(false);
    hideBannerPadding();
    initSentryClientFromConsent();
  };

  if (hideChrome || !visible) return null;

  const cerezHref = `/cerez-politikasi${lang === "en" ? "?lang=en" : ""}`;
  const kvkkHref = `/kvkk${lang === "en" ? "?lang=en" : ""}`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-orange-200/90 bg-gradient-to-t from-orange-50 via-white to-amber-50/95 px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm max-[480px]:pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2 text-sm leading-snug text-slate-800">
          <p id="cookie-consent-title" className="font-semibold text-orange-950">
            {lang === "tr" ? "Çerez ve gizlilik" : "Cookies & privacy"}
          </p>
          <p className="text-slate-700">
            {lang === "tr"
              ? "Zorunlu çerezler (oturum, güvenlik, kayıt doğrulaması) olmadan site çalışmaz. İsteğe bağlı olarak üçüncü taraf hata izleme (Sentry) yalnızca “Tümünü kabul et” ile yüklenir. Ayrıntılar:"
              : "Essential cookies (session, security, signup verification) are required for the service. Optional third‑party error monitoring (Sentry) loads only if you choose “Accept all”. Details:"}{" "}
            <Link href={cerezHref} className="font-medium text-orange-800 underline decoration-orange-300 underline-offset-2">
              {lang === "tr" ? "Çerez politikası" : "Cookie policy"}
            </Link>
            {", "}
            <Link href={kvkkHref} className="font-medium text-orange-800 underline decoration-orange-300 underline-offset-2">
              {lang === "tr" ? "KVKK" : "Privacy notice"}
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            onClick={() => acceptChoice("essential")}
          >
            {lang === "tr" ? "Yalnızca zorunlu" : "Essential only"}
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            onClick={() => acceptChoice("full")}
          >
            {lang === "tr" ? "Tümünü kabul et" : "Accept all"}
          </button>
        </div>
      </div>
    </div>
  );
}
