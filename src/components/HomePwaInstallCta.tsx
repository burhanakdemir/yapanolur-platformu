"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { dictionary } from "@/lib/i18n";
import { HOME_SIDEBAR_CTA_TILE } from "@/lib/homeMainCategoryTileClass";

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

export default function HomePwaInstallCta({ lang }: { lang: Lang }) {
  const t = dictionary[lang].home.pwaInstall;
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"ios" | "android">("android");
  const [installing, setInstalling] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const [pwaJustInstalled, setPwaJustInstalled] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEventPlus | null>(null);
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
      setPwaJustInstalled(true);
      setStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const openModal = useCallback(() => {
    const g = guessMobileOs();
    setTab(g === "ios" ? "ios" : "android");
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const runAndroidInstall = useCallback(async () => {
    const d = deferredRef.current;
    if (!d) return;
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

  if (!mounted) {
    return (
      <div
        className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} flex min-h-[44px] w-full animate-pulse items-center justify-center rounded-md bg-orange-200/50 text-transparent sm:min-h-[36px]`}
        aria-hidden
      >
        …
      </div>
    );
  }

  if (standalone || pwaJustInstalled) {
    return (
      <div
        className={`${HOME_SIDEBAR_CTA_TILE} border border-emerald-400/50 bg-emerald-50/90 text-emerald-900`}
        role="status"
      >
        <span className="text-xs font-semibold leading-tight">{t.alreadyInstalled}</span>
      </div>
    );
  }

  const isDev = process.env.NODE_ENV !== "production";

  const modal =
    mounted &&
    modalOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-3"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label={t.close}
          onClick={() => setModalOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-[101] w-full max-w-md rounded-2xl border border-orange-200/80 bg-white p-4 shadow-xl max-h-[85dvh] overflow-y-auto"
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
            aria-label={t.wrongDevice}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ios"}
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
              type="button"
              role="tab"
              aria-selected={tab === "android"}
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

          <div className="mt-4 text-sm text-slate-800">
            {tab === "ios" ? (
              <div className="space-y-3">
                <p className="font-medium text-slate-900">{t.iosTitle}</p>
                <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed">
                  <li>{t.iosStep1}</li>
                  <li>{t.iosStep2}</li>
                  <li>{t.iosStep3}</li>
                </ol>
              </div>
            ) : (
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
            )}
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

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={openModal}
        className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} flex min-h-[44px] w-full flex-col justify-center gap-0.5 py-1.5 sm:min-h-[36px]`}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
      >
        <span className="block text-center text-xs font-semibold leading-tight sm:text-sm">
          {t.cta}
        </span>
        <span className="block text-center text-[10px] font-normal leading-tight text-white/90 sm:text-[11px]">
          {t.ctaSub}
        </span>
      </button>
      {modal}
    </div>
  );
}
