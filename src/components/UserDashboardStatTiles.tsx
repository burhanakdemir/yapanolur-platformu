"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { displayAdTitle } from "@/lib/adTitleDisplay";

type StatListingRow = { id: string; title: string; status: string };
type StatBidRow = {
  id: string;
  amountTry: number;
  createdAt: string;
  adId: string;
  adTitle: string;
};
type StatPendingRow = { id: string; title: string; createdAt: string };
type StatPaymentRow = {
  id: string;
  amountTry: number;
  createdAt: string;
  paidAt: string | null;
  provider: string;
};

type TileId = "listings" | "bids" | "pending" | "payments";

type Copy = {
  statListings: string;
  statBids: string;
  statPending: string;
  statPayments: string;
  clickHint: string;
  close: string;
  empty: string;
  status: string;
  listingPage: string;
  amount: string;
  date: string;
  provider: string;
};

type Props = {
  lang: "tr" | "en";
  counts: { listings: number; bids: number; pending: number; payments: number };
  listings: StatListingRow[];
  bids: StatBidRow[];
  pending: StatPendingRow[];
  payments: StatPaymentRow[];
  copy: Copy;
};

function fmtDate(iso: string, lang: "tr" | "en") {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === "tr" ? "tr-TR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function UserDashboardStatTiles({
  lang,
  counts,
  listings,
  bids,
  pending,
  payments,
  copy,
}: Props) {
  const [open, setOpen] = useState<TileId | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const titleFor: Record<TileId, string> = {
    listings: copy.statListings,
    bids: copy.statBids,
    pending: copy.statPending,
    payments: copy.statPayments,
  };

  const modalBody = open ? (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(null);
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stat-modal-title"
        className="relative z-[201] flex max-h-[min(85vh,560px)] w-full max-w-lg flex-col rounded-2xl border border-orange-200/90 bg-[#fff7ed] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-orange-200/80 px-4 py-3">
          <h2 id="stat-modal-title" className="text-lg font-semibold text-orange-950">
            {open ? titleFor[open] : ""}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-orange-100/80"
            onClick={() => setOpen(null)}
          >
            {copy.close}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {open === "listings" &&
            (listings.length === 0 ? (
              <p className="text-sm text-slate-600">{copy.empty}</p>
            ) : (
              <ul className="space-y-2">
                {listings.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-orange-100 bg-white/95 px-3 py-2 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-medium text-slate-900">{displayAdTitle(row.title)}</span>
                      <span className="text-xs text-slate-500">
                        {copy.status}: {row.status}
                      </span>
                    </div>
                    {row.status === "APPROVED" ? (
                      <Link
                        className="mt-1 inline-block text-xs font-semibold text-orange-700 underline"
                        href={`/ads/${row.id}`}
                      >
                        {copy.listingPage} →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ))}
          {open === "bids" &&
            (bids.length === 0 ? (
              <p className="text-sm text-slate-600">{copy.empty}</p>
            ) : (
              <ul className="space-y-2">
                {bids.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-orange-100 bg-white/95 px-3 py-2 text-sm shadow-sm"
                  >
                    <p className="font-medium text-slate-900">{displayAdTitle(row.adTitle)}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {copy.amount}: {row.amountTry} TL · {copy.date}: {fmtDate(row.createdAt, lang)}
                    </p>
                    <Link
                      className="mt-1 inline-block text-xs font-semibold text-orange-700 underline"
                      href={`/ads/${row.adId}`}
                    >
                      {copy.listingPage} →
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          {open === "pending" &&
            (pending.length === 0 ? (
              <p className="text-sm text-slate-600">{copy.empty}</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-orange-100 bg-white/95 px-3 py-2 text-sm shadow-sm"
                  >
                    <p className="font-medium text-slate-900">{displayAdTitle(row.title)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{fmtDate(row.createdAt, lang)}</p>
                  </li>
                ))}
              </ul>
            ))}
          {open === "payments" &&
            (payments.length === 0 ? (
              <p className="text-sm text-slate-600">{copy.empty}</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-orange-100 bg-white/95 px-3 py-2 text-sm shadow-sm"
                  >
                    <p className="font-semibold text-orange-950">
                      {copy.amount}: {row.amountTry} TL
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {copy.provider}: {row.provider}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.paidAt ? fmtDate(row.paidAt, lang) : fmtDate(row.createdAt, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
    </div>
  ) : null;

  const statTiles: { id: TileId; emoji: string; label: string; count: number }[] = [
    { id: "listings", emoji: "📋", label: copy.statListings, count: counts.listings },
    { id: "bids", emoji: "💰", label: copy.statBids, count: counts.bids },
    { id: "pending", emoji: "⏳", label: copy.statPending, count: counts.pending },
    { id: "payments", emoji: "✅", label: copy.statPayments, count: counts.payments },
  ];

  return (
    <>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            title={copy.clickHint}
            className="admin-nav-card group flex w-full min-w-0 cursor-pointer flex-row items-center justify-between gap-2 rounded-xl border border-orange-200/80 p-2.5 text-left transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-orange-400"
            onClick={() => setOpen(tile.id)}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-lg leading-none" aria-hidden>
                {tile.emoji}
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-orange-950 group-hover:text-orange-900">
                {tile.label}
              </span>
            </div>
            <span className="shrink-0 text-lg font-bold tabular-nums leading-none text-orange-950 sm:text-xl">
              {tile.count}
            </span>
          </button>
        ))}
      </div>
      {typeof document !== "undefined" && open ? createPortal(modalBody, document.body) : null}
    </>
  );
}
