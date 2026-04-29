"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isShowcaseDay } from "@/lib/showcaseDurations";

function TopupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "en" ? "en" : "tr";
  const [message, setMessage] = useState("");
  const [balanceTry, setBalanceTry] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [payingShowcaseFromBalance, setPayingShowcaseFromBalance] = useState(false);

  const initialAmount = Number(searchParams.get("amount") || 0);
  const reason = searchParams.get("reason") || "";
  const adId = searchParams.get("adId") || "";
  const days = Number(searchParams.get("days") || 0);
  const showcaseCtx =
    reason === "showcase" && adId.length >= 4 && isShowcaseDay(days) && initialAmount > 0;

  const t =
    lang === "tr"
      ? {
          back: "Üye paneline dön",
          title: "Bakiye yükle",
          subtitle: "Kredi kartı ile güvenli ödeme (iyzico / PayTR).",
          showcaseHint: "Vitrin ödemesi için yönlendirildiniz. Ödeme başarılı olunca vitrin otomatik açılır.",
          showcaseBalanceTitle: "Yüklü bakiyeden vitrin",
          showcaseBalanceHint:
            "Kartla ödeme yapınca önce bakiyenize eklenir, vitrin ücreti hemen düşülür; net bakiye çoğu zaman aynı kalır. Yüklü bakiyeniz yeterliyse aşağıdan doğrudan düşebilirsiniz.",
          balanceLabel: "Mevcut bakiye",
          payFromBalance: "Bakiyeden vitrin öde",
          paying: "İşleniyor…",
          payFromBalanceOk: "Vitrin etkinleştirildi.",
          payFromBalanceErr: "Bakiyeden ödeme yapılamadı.",
          emailPh: "Hesap e-postanız",
          amountPh: "Tutar (TL)",
          provider: "Ödeme sağlayıcı",
          submit: "Ödemeyi başlat",
          success: "Kredi yüklendi.",
          fail: "Ödeme başlatılamadı.",
        }
      : {
          back: "Back to dashboard",
          title: "Add credit",
          subtitle: "Secure card payment (iyzico / PayTR).",
          showcaseHint: "You were sent here for a showcase payment. After success, showcase activates automatically.",
          showcaseBalanceTitle: "Pay showcase from balance",
          showcaseBalanceHint:
            "Card payments first credit your balance, then the showcase fee is deducted—your balance often stays the same. If your balance already covers the fee, pay below.",
          balanceLabel: "Current balance",
          payFromBalance: "Pay showcase from balance",
          paying: "Processing…",
          payFromBalanceOk: "Showcase activated.",
          payFromBalanceErr: "Could not pay from balance.",
          emailPh: "Account email",
          amountPh: "Amount (TRY)",
          provider: "Provider",
          submit: "Continue to payment",
          success: "Credit added.",
          fail: "Could not start payment.",
        };

  useEffect(() => {
    if (!showcaseCtx) return;
    let cancelled = false;
    void (async () => {
      setBalanceLoading(true);
      try {
        const res = await fetch("/api/credits/balance", { credentials: "include", cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as { balance?: number };
        if (cancelled) return;
        if (res.ok && typeof j.balance === "number") {
          setBalanceTry(j.balance);
        } else {
          setBalanceTry(null);
        }
      } catch {
        if (!cancelled) setBalanceTry(null);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showcaseCtx, adId, days, initialAmount]);

  async function payShowcaseFromBalance() {
    if (!showcaseCtx) return;
    setMessage("");
    setPayingShowcaseFromBalance(true);
    const res = await fetch(`/api/ads/${encodeURIComponent(adId)}/showcase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ days }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setPayingShowcaseFromBalance(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : t.payFromBalanceErr);
      return;
    }
    setMessage(t.payFromBalanceOk);
    setTimeout(() => {
      router.push(lang === "en" ? "/panel/user?lang=en" : "/panel/user");
    }, 600);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/credits/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: String(form.get("email") || ""),
        amountTry: Number(form.get("amountTry") || 0),
        provider: String(form.get("provider") || "iyzico"),
        reason: reason || undefined,
        adId: adId || undefined,
        days: days > 0 ? days : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || t.fail);
      return;
    }
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
      return;
    }
    setMessage(t.success);
  }

  return (
    <main id="bakiye-yukle" className="admin-canvas min-h-screen">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10 sm:px-6">
        <Link
          className="admin-back-link inline-flex"
          href={lang === "en" ? "/panel/user?lang=en" : "/panel/user"}
        >
          ← {t.back}
        </Link>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-orange-950">{t.title}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{t.subtitle}</p>
        </header>

        {reason === "showcase" ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t.showcaseHint}</p>
        ) : null}

        {showcaseCtx ? (
          <section className="glass-card space-y-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-5 shadow-lg shadow-emerald-900/5">
            <h2 className="text-base font-semibold text-emerald-950">{t.showcaseBalanceTitle}</h2>
            <p className="text-xs leading-relaxed text-emerald-900/90">{t.showcaseBalanceHint}</p>
            <p className="text-sm text-slate-800">
              {t.balanceLabel}:{" "}
              <span className="font-semibold tabular-nums">
                {balanceLoading ? "…" : balanceTry ?? "—"} TL
              </span>
            </p>
            {!balanceLoading &&
            balanceTry !== null &&
            balanceTry >= initialAmount &&
            !payingShowcaseFromBalance ? (
              <button
                type="button"
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
                onClick={() => void payShowcaseFromBalance()}
              >
                {t.payFromBalance}
              </button>
            ) : null}
            {payingShowcaseFromBalance ? (
              <p className="text-sm text-emerald-900">{t.paying}</p>
            ) : null}
          </section>
        ) : null}

        <form className="glass-card space-y-4 rounded-2xl p-6 shadow-lg shadow-orange-900/5" onSubmit={onSubmit}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-slate-900 outline-none ring-orange-200 focus:ring-2"
            placeholder={t.emailPh}
            required
          />
          <input
            name="amountTry"
            type="number"
            min={1}
            className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-slate-900 outline-none ring-orange-200 focus:ring-2"
            placeholder={t.amountPh}
            defaultValue={initialAmount > 0 ? initialAmount : undefined}
            required
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">{t.provider}</label>
            <select
              name="provider"
              className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-slate-900 outline-none ring-orange-200 focus:ring-2"
            >
              <option value="iyzico">iyzico</option>
              <option value="paytr">PayTR</option>
            </select>
          </div>
          <button className="btn-primary w-full py-3 text-base" type="submit">
            {t.submit}
          </button>
        </form>
        {message ? (
          <p className="rounded-lg border border-orange-200 bg-white/90 px-4 py-3 text-sm text-slate-800">{message}</p>
        ) : null}
      </div>
    </main>
  );
}

export default function UserTopupPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-canvas min-h-screen p-8">
          <p className="text-sm text-slate-600">…</p>
        </main>
      }
    >
      <TopupForm />
    </Suspense>
  );
}
