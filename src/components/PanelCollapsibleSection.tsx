"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

function subscribeHoverNone(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(hover: none)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function snapshotHoverNone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}

function serverSnapshotHoverNone(): boolean {
  return false;
}

type Props = {
  sectionId: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  pinLabel: string;
  unpinLabel: string;
};

export default function PanelCollapsibleSection({
  sectionId,
  title,
  description,
  children,
  pinLabel,
  unpinLabel,
}: Props) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  /** Dokunmatik / kaba işaretçi: hover yok; içerik sürekli görünsün (arama formları kullanılabilsin). */
  const primaryInputNoHover = useSyncExternalStore(
    subscribeHoverNone,
    snapshotHoverNone,
    serverSnapshotHoverNone,
  );

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem(`panelPin:${sectionId}`) === "1") {
          setPinned(true);
        }
      } catch {
        /* ignore */
      }
      setStorageReady(true);
    });
  }, [sectionId]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(`panelPin:${sectionId}`, pinned ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [storageReady, pinned, sectionId]);

  const open = pinned || hover || primaryInputNoHover;

  return (
    <section
      className="glass-card rounded-2xl p-4 sm:p-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-bold leading-tight text-orange-950">{title}</h2>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPinned((p) => !p);
          }}
          className={`shrink-0 rounded-lg p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
            pinned
              ? "bg-orange-600 text-white shadow-sm ring-1 ring-orange-700/40 hover:bg-orange-700"
              : "text-orange-500 hover:bg-orange-100/90 hover:text-orange-600"
          }`}
          aria-pressed={pinned}
          title={pinned ? unpinLabel : pinLabel}
          aria-label={pinned ? unpinLabel : pinLabel}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill={pinned ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 11.5c1.38 0 2.5-1.12 2.5-2.5S13.38 6.5 12 6.5 9.5 7.62 9.5 9s1.12 2.5 2.5 2.5Z" />
            <path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
          </svg>
        </button>
      </div>
      {open ? (
        <>
          {description ? <div className="mt-1">{description}</div> : null}
          <div className="mt-3">{children}</div>
        </>
      ) : null}
    </section>
  );
}
