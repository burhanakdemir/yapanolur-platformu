"use client";

import { displayAdTitle } from "@/lib/adTitleDisplay";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";
import { SHOWCASE_DAY_OPTIONS } from "@/lib/showcaseDurations";

type Owner = { email?: string };

type PendingAd = {
  id: string;
  listingNumber: number;
  title: string;
  createdAt: string;
  owner?: Owner;
};

type ApprovedAd = {
  id: string;
  listingNumber: number;
  title: string;
  createdAt: string;
  showcaseUntil?: string | null;
  owner?: Owner;
};

/** Ilan tarihi / vitrin özet — saat yok */
function formatTrDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminClock() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const d = new Date();
      setLabel(
        d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="text-xs tabular-nums text-slate-700">
      <span className="font-medium text-slate-600">Saat </span>
      {label || "—"}
    </p>
  );
}

function useNowMs(intervalMs: number) {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMs(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return ms;
}

function compactChipClass(extra?: string) {
  return `chip py-0.5 px-2 text-[10px] leading-tight ${extra ?? ""}`.trim();
}

/** Çerçeve: yazılar üstte, yatayda ortada */
const CELL_FRAME =
  "box-border flex min-h-10 w-full min-w-0 items-start justify-center rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-center text-[10px] text-slate-800 shadow-sm";

/** İlan adı / e-posta — çerçevede sola yaslı */
const CELL_FRAME_TITLE =
  "box-border flex min-h-10 w-full min-w-0 items-start justify-start rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-left text-[10px] text-slate-800 shadow-sm";

const ACTION_H = "flex h-9 min-h-9 w-full items-stretch gap-1";

function AdIdCell({ listingNumber }: { listingNumber: number }) {
  const label = String(listingNumber);
  return (
    <td className="w-[4rem] p-0.5 align-middle">
      <div className={`${CELL_FRAME} font-mono text-[9px] leading-tight tabular-nums text-slate-600`}>
        <span className="line-clamp-2 w-full break-all" title={`Ilan no: ${label}`}>
          {label}
        </span>
      </div>
    </td>
  );
}

function ApprovedAdRow({
  ad,
  daysValue,
  nowMs,
  onDaysChange,
  onUpdate,
}: {
  ad: ApprovedAd;
  daysValue: number;
  nowMs: number;
  onDaysChange: (d: number) => void;
  onUpdate: (
    id: string,
    action: "approve" | "reject" | "cancel" | "renew" | "showcase_free",
    days?: number,
  ) => void | Promise<void>;
}) {
  const vitrinBitis = ad.showcaseUntil ? new Date(ad.showcaseUntil).getTime() : 0;
  const vitrinAktif = vitrinBitis > nowMs;
  const vitrinShort = ad.showcaseUntil
    ? vitrinAktif
      ? `→ ${formatTrDateOnly(ad.showcaseUntil)}`
      : `bitti (${formatTrDateOnly(ad.showcaseUntil)})`
    : "yok";

  return (
    <tr className="border-b border-orange-100/90 align-middle text-[10px] last:border-0">
      <AdIdCell listingNumber={ad.listingNumber} />
      <td className="w-[16rem] min-w-[12rem] p-0.5 align-middle">
        <div className={CELL_FRAME_TITLE}>
          <Link
            href={adminUrl(`/listings/${ad.id}`)}
            title={displayAdTitle(ad.title)}
            className="line-clamp-3 w-full text-left text-xs font-semibold leading-snug text-orange-950 hover:underline"
          >
            {displayAdTitle(ad.title)}
          </Link>
        </div>
      </td>
      <td className="w-[12rem] min-w-[9rem] p-0.5 align-middle">
        <div className={`${CELL_FRAME_TITLE} !px-1.5 !py-1`} title={ad.owner?.email}>
          <span className="line-clamp-3 w-full break-all text-left text-[11px] leading-snug text-orange-900/95">
            {ad.owner?.email ?? "—"}
          </span>
        </div>
      </td>
      <td className="w-[5rem] p-0.5 align-middle">
        <div className={`${CELL_FRAME} !min-h-8 !px-1 !py-1 tabular-nums text-slate-700`}>
          <span className="line-clamp-2 w-full text-[11px] font-medium leading-snug">
            {formatTrDateOnly(ad.createdAt)}
          </span>
        </div>
      </td>
      <td className="w-[5rem] p-0.5 align-middle">
        <div
          className={`${CELL_FRAME} !min-h-8 !px-1 !py-1 ${vitrinAktif ? "text-emerald-800" : "text-slate-600"}`}
          title={ad.showcaseUntil ? formatTrDateOnly(ad.showcaseUntil) : "Vitrin yok"}
        >
          <span
            className={`line-clamp-2 w-full text-[11px] leading-snug ${vitrinAktif ? "font-semibold" : "font-medium"}`}
          >
            {ad.showcaseUntil ? vitrinShort : "Vitrin yok"}
          </span>
        </div>
      </td>
      <td className="w-[8.5rem] p-0.5 align-middle">
        <div className={ACTION_H}>
          <button
            className={`${compactChipClass("inline-flex h-full min-h-0 min-w-0 flex-1 items-center justify-center whitespace-nowrap px-1.5")}`}
            type="button"
            onClick={() => void onUpdate(ad.id, "renew")}
          >
            +7 gun
          </button>
          <button
            className={`${compactChipClass("inline-flex h-full min-h-0 min-w-0 flex-1 items-center justify-center whitespace-nowrap px-1.5")}`}
            type="button"
            onClick={() => void onUpdate(ad.id, "cancel")}
          >
            Iptal
          </button>
        </div>
      </td>
      <td className="w-[5.25rem] p-0.5">
        <label className="sr-only" htmlFor={`showcase-days-${ad.id}`}>
          Ucretsiz vitrin gun
        </label>
        <div className={`${CELL_FRAME} !min-h-8 !px-1 !py-0.5`}>
          <select
            id={`showcase-days-${ad.id}`}
            className="w-full min-w-0 cursor-pointer border-0 bg-transparent py-0 text-center text-[11px] outline-none"
            value={daysValue}
            onChange={(e) => onDaysChange(Number(e.target.value))}
          >
            {SHOWCASE_DAY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="w-[4.5rem] p-0.5">
        <button
          className="btn-primary box-border flex h-9 min-h-9 w-full items-center justify-center rounded-lg px-1.5 text-[10px] font-semibold whitespace-nowrap shadow-sm"
          type="button"
          onClick={() => void onUpdate(ad.id, "showcase_free", daysValue)}
        >
          Uygula
        </button>
      </td>
    </tr>
  );
}

export default function AdminListingsPage() {
  const nowMs = useNowMs(30_000);
  const [pendingAds, setPendingAds] = useState<PendingAd[]>([]);
  const [approvedAds, setApprovedAds] = useState<ApprovedAd[]>([]);
  const [message, setMessage] = useState("");
  const [showcaseDays, setShowcaseDays] = useState<Record<string, number>>({});

  async function loadAll() {
    const [pending, approved] = await Promise.all([
      fetch("/api/admin/pending-ads").then((r) => r.json()),
      fetch("/api/admin/ads?status=approved").then((r) => r.json()),
    ]);
    setPendingAds(Array.isArray(pending) ? pending : []);
    setApprovedAds(Array.isArray(approved) ? approved : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void loadAll();
  }, []);

  async function updateAd(
    id: string,
    action: "approve" | "reject" | "cancel" | "renew" | "showcase_free",
    days?: number,
  ) {
    const body =
      action === "showcase_free"
        ? { action: "showcase_free" as const, days: days ?? 7 }
        : { action };
    const res = await fetch(`/api/admin/ads/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? action === "showcase_free"
          ? `Ucretsiz vitrin eklendi (${data.showcaseFreeDays ?? days ?? 7} gun).`
          : "Ilan islemi tamamlandi."
        : typeof data.error === "string"
          ? data.error
          : "Hata.",
    );
    if (res.ok) await loadAll();
  }

  function getDaysForAd(id: string): number {
    return showcaseDays[id] ?? 7;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 p-4 md:p-6">
      <Link className="admin-back-link admin-back-link--compact" href={adminUrl()}>
        ← Panel
      </Link>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight">Ilan Ayarlari</h1>
        <AdminClock />
      </div>

      <section className="glass-card space-y-2 rounded-xl p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Bekleyen ilanlar</h2>
        {pendingAds.length === 0 && <p className="text-[10px] text-slate-600">Bekleyen ilan yok.</p>}
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-orange-200 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="w-[4rem] py-1 text-center font-semibold">Ilan no</th>
                <th className="w-[16rem] min-w-[12rem] py-1 text-left font-semibold">Ilan</th>
                <th className="w-[10.5rem] min-w-[8.5rem] py-1 text-left font-semibold">E-posta</th>
                <th className="w-[5rem] py-1 text-center font-semibold">Ilan tarihi</th>
                <th className="w-[8.5rem] py-1 text-center font-semibold">Islem</th>
              </tr>
            </thead>
            <tbody>
              {pendingAds.map((ad) => (
                <tr key={ad.id} className="border-b border-orange-100/90 align-middle last:border-0">
                  <AdIdCell listingNumber={ad.listingNumber} />
                  <td className="w-[16rem] min-w-[12rem] p-0.5 align-middle">
                    <div className={CELL_FRAME_TITLE}>
                      <Link
                        href={adminUrl(`/listings/${ad.id}`)}
                        title={displayAdTitle(ad.title)}
                        className="line-clamp-3 w-full text-left text-xs font-semibold leading-snug text-orange-950 hover:underline"
                      >
                        {displayAdTitle(ad.title)}
                      </Link>
                    </div>
                  </td>
                  <td className="w-[10.5rem] min-w-[8.5rem] p-0.5 align-middle">
                    <div className={`${CELL_FRAME_TITLE} !px-1.5 !py-1`} title={ad.owner?.email}>
                      <span className="line-clamp-3 w-full break-all text-left text-[11px] leading-snug text-orange-900/95">
                        {ad.owner?.email ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="w-[5rem] p-0.5 align-middle">
                    <div className={`${CELL_FRAME} !min-h-8 !px-1 !py-1 tabular-nums text-slate-700`}>
                      <span className="line-clamp-2 w-full text-[11px] font-medium leading-snug">
                        {formatTrDateOnly(ad.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="w-[8.5rem] p-0.5 align-middle">
                    <div className={ACTION_H}>
                      <button
                        className={`${compactChipClass("inline-flex h-full min-h-0 min-w-0 flex-1 items-center justify-center whitespace-nowrap px-1.5")}`}
                        type="button"
                        onClick={() => void updateAd(ad.id, "approve")}
                      >
                        Onayla
                      </button>
                      <button
                        className={`${compactChipClass("inline-flex h-full min-h-0 min-w-0 flex-1 items-center justify-center whitespace-nowrap px-1.5")}`}
                        type="button"
                        onClick={() => void updateAd(ad.id, "reject")}
                      >
                        Reddet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card space-y-2 rounded-xl p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Onayli ilanlar</h2>
        {approvedAds.length === 0 ? (
          <p className="text-[10px] text-slate-600">Onayli ilan yok.</p>
        ) : null}
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[64rem] table-fixed border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-orange-200 text-[9px] uppercase tracking-wide text-slate-500">
                <th className="w-[4rem] py-1 text-center font-semibold">Ilan no</th>
                <th className="w-[16rem] min-w-[12rem] py-1 text-left font-semibold">Ilan</th>
                <th className="w-[12rem] min-w-[9rem] py-1 text-left font-semibold">E-posta</th>
                <th className="w-[5rem] py-1 text-center font-semibold">Ilan tarihi</th>
                <th className="w-[5rem] py-1 text-center font-semibold">Vitrin</th>
                <th className="w-[8.5rem] py-1 text-center font-semibold">Islem</th>
                <th className="w-[5.25rem] py-1 text-center font-semibold">Gun</th>
                <th className="w-[4.5rem] py-1 text-center font-semibold">Uygula</th>
              </tr>
            </thead>
            <tbody className="text-[10px] text-slate-800">
              {approvedAds.map((ad) => (
                <ApprovedAdRow
                  key={ad.id}
                  ad={ad}
                  nowMs={nowMs}
                  daysValue={getDaysForAd(ad.id)}
                  onDaysChange={(d) => setShowcaseDays((prev) => ({ ...prev, [ad.id]: d }))}
                  onUpdate={updateAd}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {message ? <p className="text-[10px] text-slate-700">{message}</p> : null}
      <p className="text-[10px] text-slate-600">
        <Link href={adminUrl("/categories")} className="text-orange-900 underline hover:no-underline">
          Kategori ayarlari
        </Link>{" "}
        icin ayri sayfa.
      </p>
    </main>
  );
}
