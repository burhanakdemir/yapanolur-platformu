"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type HeroDoc = { id: string; type: string; fileUrl: string };

type Labels = {
  diploma: string;
  engineering: string;
  tax: string;
  sectionTitle: string;
  enlargeHint: string;
  close: string;
};

function labelForType(type: string, labels: Labels): string {
  if (type === "DIPLOMA") return labels.diploma;
  if (type === "ENGINEERING_SERVICE_CERTIFICATE") return labels.engineering;
  if (type === "TAX_CERTIFICATE") return labels.tax;
  return type;
}

export default function UserPanelHeroDocuments({
  documents,
  labels,
  align = "end",
  /** Hero satırında e-posta/bakiye sağında: üst çizgi yok, dar düzen. */
  variant = "default",
}: {
  documents: HeroDoc[];
  labels: Labels;
  /** Panel hero: e-posta ile profil puanı arasına sıkıştırılmış düzende ortalamak için `center`. */
  align?: "center" | "end";
  variant?: "default" | "inline";
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const close = useCallback(() => setLightboxUrl(null), []);

  useEffect(() => {
    if (!lightboxUrl) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxUrl, close]);

  if (documents.length === 0) return null;

  const modal =
    lightboxUrl && typeof document !== "undefined" ? (
      createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={labels.enlargeHint}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            onClick={close}
          >
            {labels.close}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- external / uploaded URLs */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[min(90vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )
    ) : null;

  const isInline = variant === "inline";
  const titleAlign = isInline
    ? "text-right"
    : align === "center"
      ? "text-center"
      : "text-left";
  const listJustify = isInline
    ? "justify-end"
    : align === "center"
      ? "justify-center"
      : "justify-end";

  const shellClass = isInline
    ? "w-fit max-w-full shrink-0 self-end sm:self-auto"
    : "w-full border-t border-white/25 pt-3";

  const thumbClass = isInline
    ? "h-12 w-12 object-cover sm:h-14 sm:w-14"
    : "h-16 w-16 object-cover sm:h-[4.5rem] sm:w-[4.5rem]";

  return (
    <>
      <div className={shellClass}>
        <p
          className={`mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-orange-100/90 sm:mb-2 sm:text-[10px] ${titleAlign}`}
        >
          {labels.sectionTitle}
        </p>
        <ul className={`flex flex-wrap gap-1.5 sm:gap-2 ${listJustify}`}>
          {documents.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="group relative block overflow-hidden rounded-lg border border-white/35 bg-white/10 shadow-md transition hover:border-white/60 hover:ring-2 hover:ring-white/40"
                onClick={() => setLightboxUrl(d.fileUrl)}
                aria-label={`${labelForType(d.type, labels)} — ${labels.enlargeHint}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.fileUrl}
                  alt=""
                  className={thumbClass}
                />
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-black/55 px-1 py-0.5 text-[9px] font-medium leading-tight text-white">
                  {labelForType(d.type, labels)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {modal}
    </>
  );
}
