"use client";

import { useCallback, useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  onSelectIndividual: () => void;
  onSelectCorporate: () => void;
  /** Esc veya X: güvenli varsayılan olarak bireysel kayıt seçilir (form kilitlenmez). */
  onDismissToIndividual: () => void;
};

/**
 * Üye kaydı öncesi: bireysel / kurumsal seçimi. Odak tuzağı ve dialog erişilebilirliği.
 */
export default function SignupTypeModal({
  open,
  onSelectIndividual,
  onSelectCorporate,
  onDismissToIndividual,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !panelRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onDismissToIndividual();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const root = panelRef.current;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const list = [...focusables].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    },
    [open, onDismissToIndividual],
  );

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const firstBtn = panelRef.current?.querySelector<HTMLButtonElement>("button");
      firstBtn?.focus();
    }, 0);
    document.addEventListener("keydown", trapFocus);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, trapFocus]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      aria-hidden={false}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Kapat ve bireysel kayda geç"
        onClick={() => onDismissToIndividual()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[min(90vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-orange-500/45 bg-orange-50/90 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/20 bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-bold leading-tight text-white/90 sm:text-xl">
            Kayıt türü seçin
          </h2>
          <button
            type="button"
            onClick={() => onDismissToIndividual()}
            className="shrink-0 rounded-lg p-2 text-sm font-semibold text-white/90 transition hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
            aria-label="Kapat (bireysel kayıt)"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto bg-orange-50/70 px-5 py-4 sm:px-6 sm:py-5">
          <p className="mb-4 text-sm leading-relaxed text-orange-950/75">
            Devam etmek için <strong className="font-semibold text-orange-950">bireysel</strong> veya{" "}
            <strong className="font-semibold text-orange-950">kurumsal</strong> üyelik seçin. Seçiminizi sonradan bu
            ekrandan değiştirebilirsiniz (e-posta / telefon doğrulaması etkilenmez).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <button
              type="button"
              onClick={() => onSelectIndividual()}
              className="group flex min-h-[5.5rem] flex-col items-start justify-center rounded-[10px] border-2 border-orange-400/80 bg-orange-100/90 px-4 py-4 text-left shadow-sm transition hover:border-transparent hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              <span className="text-base font-bold text-orange-950 group-hover:text-white/90">
                Bireysel kayıt
              </span>
              <span className="mt-1 text-xs font-normal text-orange-900/70 group-hover:text-white/80">
                TC kimlik ve bireysel fatura bilgileri ile mevcut form.
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSelectCorporate()}
              className="group flex min-h-[5.5rem] flex-col items-start justify-center rounded-[10px] border-2 border-orange-400/80 bg-orange-50/95 px-4 py-4 text-left shadow-sm transition hover:border-transparent hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              <span className="text-base font-bold text-orange-950 group-hover:text-white/90">
                Kurumsal kayıt
              </span>
              <span className="mt-1 text-xs font-normal text-orange-900/70 group-hover:text-white/80">
                Yetkili kişi adı-soyadı ve şirket fatura bilgileri.
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
