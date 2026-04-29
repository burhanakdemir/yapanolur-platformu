"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getLang, type Lang } from "@/lib/i18n";

function adLangSuffix(lang: Lang) {
  return lang === "en" ? "?lang=en" : "";
}
import { AdAccessAdSummary, type AdAccessSummaryAd } from "@/components/AdAccessAdSummary";

type AccessPayload = {
  ad: AdAccessSummaryAd & { id: string };
  settings: {
    detailViewFeeEnabled: boolean;
    detailViewFeeAmountTry: number;
    bidAccessFeeEnabled: boolean;
    bidAccessFeeAmountTry: number;
  };
  session: { userId: string; role: string; isOwner: boolean; isAdmin: boolean } | null;
  access: { hasDetailPaid: boolean; hasBidAccessPaid: boolean };
  balance: number;
  bypassPayment: boolean;
};

function AdAccessPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const router = useRouter();
  const lang = getLang(searchParams.get("lang") ?? undefined);
  const [data, setData] = useState<AccessPayload | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<"detail" | "bid" | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id || typeof id !== "string") {
      queueMicrotask(() => {
        if (!cancelled) {
          setErr("Gecersiz ilan baglantisi.");
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const adId = id;

    async function run() {
      try {
        const res = await fetch(`/api/ads/${encodeURIComponent(adId)}/access`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const text = await res.text();
        let j: Record<string, unknown>;
        try {
          j = JSON.parse(text) as Record<string, unknown>;
        } catch {
          if (!cancelled) {
            setErr(
              `Sunucu yaniti okunamadi (${res.status}). Sayfayi yenileyin veya gelistirici konsolunu kontrol edin.`,
            );
            setLoading(false);
          }
          return;
        }
        if (cancelled) return;

        if (j.bypassPayment) {
          router.replace(`/ads/${adId}${adLangSuffix(lang)}`);
          return;
        }
        if (j.error) {
          const base = typeof j.error === "string" ? j.error : "Yuklenemedi.";
          const detail = typeof j.detail === "string" ? ` (${j.detail})` : "";
          const hint = typeof j.hint === "string" ? ` ${j.hint}` : "";
          setErr(`${base}${detail}${hint}`);
          setLoading(false);
          return;
        }
        setData(j as AccessPayload);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setErr("Baglanti hatasi. Sunucu calisiyor mu kontrol edin.");
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, router, lang]);

  async function pay(action: "detail" | "bid") {
    if (!id || typeof id !== "string") return;
    setErr("");
    setPaying(action);
    const res = await fetch(`/api/ads/${encodeURIComponent(id)}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action }),
    });
    const j = await res.json().catch(() => ({}));
    setPaying(null);
    if (!res.ok) {
      setErr(typeof j.error === "string" ? j.error : "Odeme yapilamadi.");
      return;
    }
    const suffix = adLangSuffix(lang);
    if (action === "detail") {
      router.push(`/ads/${id}${suffix}`);
    } else {
      router.push(`/ads/${id}${suffix}#teklif`);
    }
  }

  function onLoginSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || typeof id !== "string") return;
    window.location.href = `/login?next=${encodeURIComponent(`/ads/${id}${adLangSuffix(lang)}`)}`;
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg p-6 text-slate-600">
        Yukleniyor...
      </main>
    );
  }

  if (!data && err) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-6">
        <p className="text-sm text-red-700">{err}</p>
        <HomeBackButtonLink href="/">Ana Sayfa</HomeBackButtonLink>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const { ad, settings, session, access, balance } = data;
  const detailOn = settings.detailViewFeeEnabled && settings.detailViewFeeAmountTry > 0;
  const bidOn = settings.bidAccessFeeEnabled && settings.bidAccessFeeAmountTry > 0;

  if (!detailOn && !bidOn) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-6">
        <AdAccessAdSummary ad={ad} lang={lang} />
        <p className="text-sm text-slate-700">Bu ilan icin erisim ucreti tanimli degil.</p>
        <Link className="btn-primary inline-block" href={`/ads/${id}${adLangSuffix(lang)}`}>
          Ilan detayina git
        </Link>
      </main>
    );
  }

  if (!session) {
    const membersHref = lang === "en" ? "/members?lang=en#uye-kayit" : "/members#uye-kayit";
    return (
      <main className="mx-auto max-w-lg space-y-6 p-6">
        <HomeBackButtonLink href={`/?lang=${lang}`}>Ana Sayfa</HomeBackButtonLink>
        <AdAccessAdSummary ad={ad} lang={lang} />
        <p className="text-sm text-amber-900">
          Detay görmek veya teklif vermek için önce üye kaydı yapın veya giriş yapın.
        </p>
        <Link className="btn-primary block w-full text-center" href={membersHref}>
          Üye kayıt sayfasına git
        </Link>
        <form onSubmit={onLoginSubmit}>
          <button className="chip w-full border-orange-300 bg-white py-3 text-orange-900" type="submit">
            Zaten hesabım var — giriş yap
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <HomeBackButtonLink href={`/?lang=${lang}`}>Ana Sayfa</HomeBackButtonLink>
      <AdAccessAdSummary ad={ad} lang={lang} />
      <p className="text-sm text-slate-700">
        Bakiye: <span className="font-semibold tabular-nums">{balance} TL</span>
      </p>

      {err && <p className="text-sm text-red-700">{err}</p>}

      <div className="grid gap-4">
        {detailOn && (
          <section className="glass-card space-y-3 rounded-2xl border border-orange-200 p-4">
            <h2 className="font-semibold text-orange-950">Detay gor</h2>
            <p className="text-xs text-slate-600">
              Ilan aciklamasi, konum ve gorseller icin tek seferlik ucret.
            </p>
            <p className="text-sm font-medium text-slate-800">
              {settings.detailViewFeeAmountTry} TL
            </p>
            {access.hasDetailPaid ? (
              <Link className="btn-primary inline-block w-full text-center" href={`/ads/${id}${adLangSuffix(lang)}`}>
                Detaya git
              </Link>
            ) : (
              <button
                className="btn-primary w-full"
                type="button"
                disabled={paying !== null}
                onClick={() => void pay("detail")}
              >
                {paying === "detail" ? "Isleniyor..." : "Detay icin ode"}
              </button>
            )}
          </section>
        )}

        {bidOn && (
          <section className="glass-card space-y-3 rounded-2xl border border-emerald-200 p-4">
            <h2 className="font-semibold text-emerald-950">Teklif ver</h2>
            <p className="text-xs text-slate-600">
              Bu ilanda teklif formunu acmak icin tek seferlik ucret (ayrica teklif basina ucret
              varsa uygulanir).
            </p>
            <p className="text-sm font-medium text-slate-800">
              {settings.bidAccessFeeAmountTry} TL
            </p>
            {access.hasBidAccessPaid ? (
              <Link
                className="btn-primary inline-block w-full text-center"
                href={`/ads/${id}${adLangSuffix(lang)}#teklif`}
              >
                Teklif sayfasina git
              </Link>
            ) : (
              <button
                className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
                type="button"
                disabled={paying !== null}
                onClick={() => void pay("bid")}
              >
                {paying === "bid" ? "Isleniyor..." : "Teklif hakki icin ode"}
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default function AdAccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg p-6 text-slate-600">Yukleniyor...</main>
      }
    >
      <AdAccessPageInner />
    </Suspense>
  );
}
