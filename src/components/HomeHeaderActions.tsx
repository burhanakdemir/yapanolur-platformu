"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

/** Oturum: yan yana chip; sabit genişlik yok (tek satırda sığsın). */
const SESSION_CHIP =
  "chip font-medium inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap px-3 py-1 text-center text-xs no-underline";

type Query = {
  categoryId?: string;
  tab?: string;
  lang?: string;
  province?: string;
  district?: string;
  neighborhood?: string;
};

function buildHomeHref(nextLang: Lang, q: Query): string {
  const sp = new URLSearchParams();
  if (q.categoryId) sp.set("categoryId", q.categoryId);
  if (q.tab) sp.set("tab", q.tab);
  if (q.province) sp.set("province", q.province);
  if (q.district) sp.set("district", q.district);
  if (q.neighborhood) sp.set("neighborhood", q.neighborhood);
  sp.set("lang", nextLang);
  return `/?${sp.toString()}`;
}

type Props = {
  lang: Lang;
  query: Query;
};

export default function HomeHeaderActions({ lang, query }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = LANG_OPTIONS.find((o) => o.value === lang) ?? LANG_OPTIONS[0];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (r) => {
        const data = (await r.json()) as { authenticated?: boolean };
        if (!cancelled) setSessionActive(!!data?.authenticated);
      })
      .catch(() => {
        if (!cancelled) setSessionActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setSessionActive(false);
    router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-[2rem] w-full min-w-0 flex-1 flex-row items-center justify-end md:min-w-[12rem]">
      <div className="ml-auto flex min-w-0 flex-row flex-wrap items-center justify-end gap-2 md:gap-3">
        {sessionActive === null ? (
          <div className="flex flex-row items-center gap-2" aria-hidden>
            <span className="chip inline-block h-8 min-w-[5.5rem] animate-pulse bg-orange-100/60 opacity-70" />
            <span className="chip inline-block h-8 min-w-[5.5rem] animate-pulse bg-orange-100/60 opacity-70" />
          </div>
        ) : sessionActive ? (
          <>
            <button type="button" className={SESSION_CHIP} onClick={() => void logout()}>
              {lang === "tr" ? "Kullanıcı Çıkış" : "Sign out"}
            </button>
            <Link href={`/panel/user?lang=${lang}`} className={SESSION_CHIP}>
              {lang === "tr" ? "Benim Sayfam" : "My page"}
            </Link>
          </>
        ) : (
          <Link className={SESSION_CHIP} href="/login">
            {lang === "tr" ? "Kullanıcı Girişi" : "User Login"}
          </Link>
        )}

        <div ref={rootRef} className="relative shrink-0">
          <button
          type="button"
          id="home-lang-trigger"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="home-lang-listbox"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-[8.75rem] items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-2 py-1.5 text-left text-xs font-medium text-orange-900 shadow-sm transition hover:bg-orange-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <span>{current.label}</span>
          <span className="text-base leading-none" aria-hidden>
            {current.flag}
          </span>
          <span
            className={`ml-auto text-[9px] text-orange-800/80 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▼
          </span>
          </button>

          {open && (
            <div
              id="home-lang-listbox"
              role="listbox"
              aria-labelledby="home-lang-trigger"
              className="absolute right-0 top-[calc(100%+3px)] z-50 flex min-w-[8.75rem] flex-col gap-0.5 rounded-lg border border-orange-300 bg-white p-1.5 shadow-lg"
            >
              {LANG_OPTIONS.map((opt) => {
                const active = lang === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      if (opt.value !== lang) {
                        router.push(buildHomeHref(opt.value, query));
                      }
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                        : "text-orange-900 hover:bg-orange-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-base leading-none" aria-hidden>
                      {opt.flag}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
