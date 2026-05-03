"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { dictionary } from "@/lib/i18n";
import { HOME_SIDEBAR_CTA_TILE } from "@/lib/homeMainCategoryTileClass";
import { trackPwaInstall } from "@/lib/pwaInstallAnalytics";

/** CTA glow — HomePostListingStrip ile aynı sınıf adı */
const CTA_GLOW = "home-post-listing-cta-glow";

function guessMobileOs(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return "ios";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

type BeforeInstallPromptEventPlus = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type HomePwaInstallEligibility = "sidebar-guest" | "sidebar-member";

export default function HomePwaInstallCta({
  lang,
  eligibility = "sidebar-guest",
  wrapClassName,
}: {
  lang: Lang;
  /** `sidebar-member`: yalnızca dar ekran + dokunmatik benzeri ortam (dar masaüstü penceresinde yanlış tetiklemeyi azaltır). */
  eligibility?: HomePwaInstallEligibility;
  /** Dış layout hücresi — `standalone` iken hiç render edilmez (boş sütun kalmaz). */
  wrapClassName?: string;
}) {
  const t = dictionary[lang].home.pwaInstall;
  const titleId = useId();
  const tabBaseId = useId().replace(/:/g, "");
  const iosTabId = `${tabBaseId}-tab-ios`;
  const androidTabId = `${tabBaseId}-tab-android`;
  const iosPanelId = `${tabBaseId}-panel-ios`;
  const androidPanelId = `${tabBaseId}-panel-android`;

  const [mounted, setMounted] = useState(false);
  const [memberGate, setMemberGate] = useState<"pending" | "show" | "hide">(
    eligibility === "sidebar-member" ? "pending" : "show",
  );
  const [standalone, setStandalone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"ios" | "android">("android");
  const [installing, setInstalling] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEventPlus | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mqStandalone = window.matchMedia("(display-mode: standalone)");
    const upd = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      setStandalone(
        mqStandalone.matches === true || nav.standalone === true,
      );
    };
    upd();
    mqStandalone.addEventListener("change", upd);
    return () => mqStandalone.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    if (eligibility !== "sidebar-member") return;
    const run = () => {
      const narrow = window.matchMedia("(max-width: 767.98px)").matches;
      const touchLike =
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches ||
        navigator.maxTouchPoints > 0;
      setMemberGate(narrow && touchLike ? "show" : "hide");
    };
    run();
    const m1 = window.matchMedia("(max-width: 767.98px)");
    const m2 = window.matchMedia("(pointer: coarse)");
    const m3 = window.matchMedia("(hover: none)");
    const fn = () => run();
    m1.addEventListener("change", fn);
    m2.addEventListener("change", fn);
    m3.addEventListener("change", fn);
    return () => {
      m1.removeEventListener("change", fn);
      m2.removeEventListener("change", fn);
      m3.removeEventListener("change", fn);
    };
  }, [eligibility]);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEventPlus;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      trackPwaInstall("pwa_appinstalled");
      setStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const openModal = useCallback(() => {
    const g = guessMobileOs();
    setTab(g === "ios" ? "ios" : "android");
    trackPwaInstall("pwa_modal_open");
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const root = dialogRef.current;
    if (!root) return;

    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) =>
          el.getAttribute("aria-hidden") !== "true" && !el.hasAttribute("disabled"),
      );

    requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const runAndroidInstall = useCallback(async () => {
    const d = deferredRef.current;
    if (!d) return;
    trackPwaInstall("pwa_android_install_click");
    setInstalling(true);
    try {
      await d.prompt();
      await d.userChoice;
      setModalOpen(false);
    } finally {
      deferredRef.current = null;
      setInstallReady(false);
      setInstalling(false);
    }
  }, []);

  const onCtaClick = useCallback(() => {
    trackPwaInstall("pwa_cta_click");
    openModal();
  }, [openModal]);

  const wrap = useCallback(
    (node: ReactNode) =>
      wrapClassName ? <div className={wrapClassName}>{node}</div> : node,
    [wrapClassName],
  );

  if (!mounted || (eligibility === "sidebar-member" && memberGate === "pending")) {
    return wrap(
      <div
        className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} flex min-h-[44px] w-full animate-pulse items-center justify-center rounded-md bg-orange-200/50 text-transparent sm:min-h-[36px]`}
        aria-hidden
      >
        …
      </div>,
    );
  }

  if (eligibility === "sidebar-member" && memberGate === "hide") {
    return null;
  }

  /** Tam ekran / ana ekran kısayolu: buton tamamen gösterilmez */
  if (standalone) {
    return null;
  }

  const isDev = process.env.NODE_ENV !== "production";

  const modal =
    mounted &&
    modalOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[210] flex items-end justify-center p-3 sm:items-center"
        role="presentation"
      >
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label={t.close}
          onClick={() => setModalOpen(false)}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-[211] max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-orange-200/80 bg-white p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {t.modalTitle}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => setModalOpen(false)}
            >
              {t.close}
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-600">{t.wrongDevice}</p>
          <div
            className="mt-2 flex gap-2"
            role="tablist"
            aria-label={t.devicePickerAriaLabel}
          >
            <button
              id={iosTabId}
              type="button"
              role="tab"
              aria-selected={tab === "ios"}
              aria-controls={iosPanelId}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                tab === "ios"
                  ? "border-orange-500 bg-orange-50 text-orange-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setTab("ios")}
            >
              {t.pickIos}
            </button>
            <button
              id={androidTabId}
              type="button"
              role="tab"
              aria-selected={tab === "android"}
              aria-controls={androidPanelId}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                tab === "android"
                  ? "border-orange-500 bg-orange-50 text-orange-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setTab("android")}
            >
              {t.pickAndroid}
            </button>
          </div>

          <div
            id={iosPanelId}
            role="tabpanel"
            aria-labelledby={iosTabId}
            hidden={tab !== "ios"}
            className="mt-4 text-sm text-slate-800"
          >
            <div className="space-y-3">
              <p className="font-medium text-slate-900">{t.iosTitle}</p>
              <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed">
                <li>{t.iosStep1}</li>
                <li>{t.iosStep2}</li>
                <li>{t.iosStep3}</li>
              </ol>
            </div>
          </div>

          <div
            id={androidPanelId}
            role="tabpanel"
            aria-labelledby={androidTabId}
            hidden={tab !== "android"}
            className="mt-4 text-sm text-slate-800"
          >
            <div className="space-y-3">
              <p className="font-medium text-slate-900">{t.androidTitle}</p>
              <p className="text-sm leading-relaxed text-slate-700">{t.androidBody}</p>
              {installReady ? (
                <button
                  type="button"
                  className="btn-primary w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  onClick={runAndroidInstall}
                  disabled={installing}
                >
                  {installing ? t.installing : t.install}
                </button>
              ) : (
                <p className="rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                  {t.androidFallback}
                </p>
              )}
            </div>
          </div>

          {isDev ? (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
              {t.devHint}
            </p>
          ) : null}
        </div>
      </div>,
      document.body,
    );

  return wrap(
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={onCtaClick}
        className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} flex min-h-[44px] w-full items-center justify-center px-2 py-2 sm:min-h-[36px]`}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
      >
        <span className="text-center text-xs font-semibold leading-tight sm:text-sm">{t.cta}</span>
      </button>
      {modal}
    </div>,
  );
}
