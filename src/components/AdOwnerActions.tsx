"use client";

import { useEffect, useState } from "react";
import { SHOWCASE_DAY_OPTIONS } from "@/lib/showcaseDurations";

const EXTEND_DAY_OPTIONS = [1, 3, 5, 7, 14, 21, 30];

type Props = {
  adId: string;
  lang: "tr" | "en";
  status: string;
  auctionEndsAt: string | null;
  showcaseUntil: string | null;
  onUpdated: () => void;
};

export default function AdOwnerActions({
  adId,
  lang,
  status,
  auctionEndsAt: auctionEndsAtIso,
  showcaseUntil: showcaseUntilIso,
  onUpdated,
}: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showcaseDays, setShowcaseDays] = useState(7);
  const [extendDays, setExtendDays] = useState(7);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [clockMs, setClockMs] = useState<number | null>(null);

  useEffect(() => {
    setClockMs(Date.now());
    const id = window.setInterval(() => setClockMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const tr = lang === "tr";
  const showcaseActive =
    showcaseUntilIso && clockMs !== null ? new Date(showcaseUntilIso).getTime() > clockMs : false;

  async function postManage(body: { action: string; days?: number }) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/ads/${adId}/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : tr ? "Islem basarisiz." : "Action failed.");
        return;
      }
      setMessage(tr ? "Islem tamamlandi." : "Done.");
      setConfirmCancel(false);
      setConfirmComplete(false);
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function postShowcase() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/ads/${adId}/showcase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: showcaseDays }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : tr ? "Vitrin basarisiz." : "Showcase failed.");
        return;
      }
      setMessage(
        tr
          ? `Vitrin: ${data.days} gun. Kesilen: ${data.feeChargedTry ?? 0} TL`
          : `Showcase: ${data.days} d. Charged: ${data.feeChargedTry ?? 0}`,
      );
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  if (status === "CANCELLED" || status === "COMPLETED") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {tr
          ? status === "CANCELLED"
            ? "Bu ilan iptal edilmistir."
            : "Bu ilan sonuclandirilmistir."
          : status === "CANCELLED"
            ? "This listing was cancelled."
            : "This listing was completed."}
        {auctionEndsAtIso ? (
          <span className="ml-1 tabular-nums text-slate-500">
            ({new Date(auctionEndsAtIso).toLocaleString(tr ? "tr-TR" : "en-GB")})
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/90 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
        {tr ? "Ilan yonetimi (ilan sahibi)" : "Listing management (owner)"}
      </p>

      {status === "APPROVED" ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-600">
            {tr ? "Vitrin suresi" : "Showcase duration"}
            <select
              className="rounded-md border bg-white px-2 py-1.5 text-sm"
              value={showcaseDays}
              onChange={(e) => setShowcaseDays(Number(e.target.value))}
              disabled={busy}
            >
              {SHOWCASE_DAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="chip text-sm"
            disabled={busy}
            onClick={() => void postShowcase()}
          >
            {tr ? "Vitrine al" : "Showcase"}
          </button>
          {showcaseActive ? (
            <span className="text-[11px] font-medium text-amber-800">{tr ? "Vitrin aktif" : "Showcase on"}</span>
          ) : null}
        </div>
      ) : null}

      {status === "APPROVED" ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-600">
            {tr ? "Sure uzat (gun)" : "Extend (days)"}
            <select
              className="rounded-md border bg-white px-2 py-1.5 text-sm"
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              disabled={busy}
            >
              {EXTEND_DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  +{d} {tr ? "gun" : "d"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="chip text-sm"
            disabled={busy}
            onClick={() => void postManage({ action: "extend", days: extendDays })}
          >
            {tr ? "Suresini uzat" : "Extend deadline"}
          </button>
          {auctionEndsAtIso ? (
            <span className="text-[11px] text-slate-600">
              {tr ? "Bitis:" : "Ends:"}{" "}
              <span className="tabular-nums font-medium text-slate-800">
                {new Date(auctionEndsAtIso).toLocaleString(tr ? "tr-TR" : "en-GB")}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      {(status === "PENDING" || status === "APPROVED") && (
        <div className="flex flex-wrap gap-2">
          {!confirmComplete ? (
            <button
              type="button"
              className="chip border border-emerald-600/40 bg-emerald-50 text-sm text-emerald-900"
              disabled={busy || status !== "APPROVED"}
              onClick={() => setConfirmComplete(true)}
            >
              {tr ? "Sonuclandir" : "Mark complete"}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-700">
                {tr
                  ? "Ihaleyi sonuclandirmak istediginize emin misiniz?"
                  : "Finalize this listing?"}
              </span>
              <button type="button" className="chip text-sm" disabled={busy} onClick={() => setConfirmComplete(false)}>
                {tr ? "Hayir" : "No"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-emerald-600 bg-emerald-600 px-2 py-1 text-sm font-medium text-white"
                disabled={busy}
                onClick={() => void postManage({ action: "complete" })}
              >
                {tr ? "Evet, sonuclandir" : "Yes, complete"}
              </button>
            </span>
          )}

          {!confirmCancel ? (
            <button
              type="button"
              className="chip border border-red-300 bg-red-50 text-sm text-red-900"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              {tr ? "Ilanı iptal et" : "Cancel listing"}
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-red-800">
                {tr ? "Ilan iptal edilecek. Emin misiniz?" : "Cancel this listing?"}
              </span>
              <button type="button" className="chip text-sm" disabled={busy} onClick={() => setConfirmCancel(false)}>
                {tr ? "Hayir" : "No"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-600 bg-red-600 px-2 py-1 text-sm font-medium text-white"
                disabled={busy}
                onClick={() => void postManage({ action: "cancel" })}
              >
                {tr ? "Evet, iptal" : "Yes, cancel"}
              </button>
            </span>
          )}
        </div>
      )}

      {message ? <p className="text-sm text-slate-800">{message}</p> : null}
    </div>
  );
}
