"use client";

import Link from "next/link";
import { useState } from "react";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { SponsorHeroPricingTry } from "@/lib/sponsorHeroPricing";
import { SPONSOR_HERO_DURATION_DAYS } from "@/lib/sponsorHeroPricing";

type Props = {
  lang: "tr" | "en";
  pricing: SponsorHeroPricingTry;
  balanceTry: number;
  topupHref: string;
  labels: {
    choosePeriod: string;
    feeForPeriod: string;
    daysSuffix: string;
    hintSelected: string;
    balanceLabel: string;
    payCta: string;
    paying: string;
    topupCta: string;
    insufficientHint: string;
    successPendingApproval: string;
    freePackageHint: string;
    submitFreeCta: string;
    duplicatePending: string;
    successPendingApprovalFree: string;
  };
};

export default function UserSponsorshipClient({
  lang,
  pricing,
  balanceTry: initialBalance,
  topupHref,
  labels,
}: Props) {
  const [days, setDays] = useState<(typeof SPONSOR_HERO_DURATION_DAYS)[number]>(30);
  const [balance, setBalance] = useState(initialBalance);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const locale = lang === "tr" ? "tr-TR" : "en-GB";
  const selectedFee = pricing[String(days) as keyof SponsorHeroPricingTry] ?? 0;

  function topupHrefForDays(): string {
    const pathAndQuery = topupHref.startsWith("/") ? topupHref : `/${topupHref}`;
    const u = new URL(pathAndQuery, "http://n");
    u.searchParams.set("sponsorDays", String(days));
    return `${u.pathname}${u.search}`;
  }

  const canPayFromBalance = selectedFee > 0 && balance >= selectedFee;
  const needsTopUp = selectedFee > 0 && balance < selectedFee;

  async function onSubmitPayment() {
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/sponsorship/purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays: days }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        if (data.duplicatePending === true) {
          setFeedback({ kind: "err", text: labels.duplicatePending });
          return;
        }
        let errText = apiErrorMessage(data.error, lang === "tr" ? "İşlem yapılamadı." : "Request failed.");
        if (typeof data.details === "string" && data.details.trim()) {
          errText = `${errText}\n\n(${data.details.slice(0, 800)})`;
        }
        setFeedback({ kind: "err", text: errText });
        if (data.needTopup === true && typeof data.balanceTry === "number") {
          setBalance(Math.max(0, Math.trunc(data.balanceTry)));
        }
        return;
      }
      if (typeof data.balanceTry === "number") {
        setBalance(Math.max(0, Math.trunc(data.balanceTry)));
      }
      const feeTry = typeof data.feeTry === "number" ? data.feeTry : null;
      const okText =
        feeTry === 0 ? labels.successPendingApprovalFree : labels.successPendingApproval;
      setFeedback({ kind: "ok", text: okText });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-card space-y-4 rounded-2xl border border-orange-200/90 p-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-orange-950">{labels.choosePeriod}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SPONSOR_HERO_DURATION_DAYS.map((d) => {
            const fee = pricing[String(d) as keyof SponsorHeroPricingTry] ?? 0;
            const id = `sponsor-days-${d}`;
            return (
              <label
                key={d}
                htmlFor={id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                  days === d
                    ? "border-orange-500 bg-orange-50/90 ring-1 ring-orange-300"
                    : "border-orange-100 bg-white/80 hover:border-orange-200"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name="sponsorPeriodDays"
                  checked={days === d}
                  onChange={() => {
                    setDays(d);
                    setFeedback(null);
                  }}
                  className="h-4 w-4 shrink-0 accent-orange-600"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-1">
                  <span className="font-semibold text-slate-900">
                    {d} {labels.daysSuffix}
                  </span>
                  <span className="tabular-nums font-bold text-orange-950">{fee.toLocaleString(locale)} ₺</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-slate-800">
        <p className="font-medium text-orange-950">
          {labels.balanceLabel}:{" "}
          <span className="tabular-nums font-bold">{balance.toLocaleString(locale)} ₺</span>
        </p>
        <p className="mt-1 font-medium text-orange-950">
          {labels.feeForPeriod}:{" "}
          <span className="tabular-nums font-bold">{selectedFee.toLocaleString(locale)} ₺</span>
        </p>
        <p className="mt-1 text-xs text-slate-600">{labels.hintSelected}</p>
      </div>

      {selectedFee <= 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">{labels.freePackageHint}</p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onSubmitPayment()}
            className="btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? labels.paying : labels.submitFreeCta}
          </button>
        </div>
      ) : needsTopUp ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-900">{labels.insufficientHint}</p>
          <Link
            href={topupHrefForDays()}
            className="btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md"
          >
            {labels.topupCta}
          </Link>
        </div>
      ) : (
        <button
          type="button"
          disabled={submitting || !canPayFromBalance}
          onClick={() => void onSubmitPayment()}
          className="btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? labels.paying : labels.payCta}
        </button>
      )}

      {feedback ? (
        <p
          className={`text-sm ${feedback.kind === "ok" ? "font-medium text-green-800" : "text-red-700"}`}
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
