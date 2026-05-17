"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Link from "next/link";
import type { RegisterConflictKind } from "@/lib/registerConflict";
import { registerConflictMessage } from "@/lib/registerConflict";

type Props = {
  open: boolean;
  kind: RegisterConflictKind;
  loginHref: string;
  onStayOnRegister: () => void;
};

export default function RegisteredMemberConflictModal({
  open,
  kind,
  loginHref,
  onStayOnRegister,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !panelRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onStayOnRegister();
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
    [open, onStayOnRegister],
  );

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
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
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Kapat"
        onClick={onStayOnRegister}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[86] w-full max-w-md overflow-hidden rounded-2xl border-2 border-orange-500/45 bg-orange-50/95 shadow-xl"
      >
        <div className="border-b border-white/20 bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-lg font-bold text-white">
            Kayıt yapılamıyor
          </h2>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <p className="text-sm font-medium leading-relaxed text-orange-950">{registerConflictMessage(kind)}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={onStayOnRegister}>
              Kayıt Sayfası
            </button>
            <Link href={loginHref} className="btn-primary w-full text-center sm:w-auto">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
