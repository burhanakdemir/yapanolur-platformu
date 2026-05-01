import type { Metadata } from "next";
import Link from "next/link";
import { getExecutiveDashboardData } from "@/lib/executive/metrics";
import { isLikelyDatabaseConnectionError } from "@/lib/dbErrors";
import { executiveDashboardHref } from "@/lib/executive/href";
import type { ExecutivePeriod } from "@/lib/executive/istanbulCalendar";
import ExecutiveSparkline from "@/components/executive/ExecutiveSparkline";
import ExecutiveProvinceBars from "@/components/executive/ExecutiveProvinceBars";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "İş özeti" };
}

const nf = new Intl.NumberFormat("tr-TR");
const tryFmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

type Props = {
  searchParams: Promise<{ period?: string; trend?: string }>;
};

const PERIODS: { id: ExecutivePeriod; label: string }[] = [
  { id: "today", label: "Bugün" },
  { id: "week", label: "Bu hafta" },
  { id: "month", label: "Bu ay" },
];

export default async function ExecutivePage({ searchParams }: Props) {
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof getExecutiveDashboardData>> | null = null;
  let loadError = "";
  try {
    data = await getExecutiveDashboardData(sp);
  } catch (e) {
    loadError = isLikelyDatabaseConnectionError(e)
      ? "Veritabanına şu an ulaşılamıyor. Yerelde Docker veya DATABASE_URL kontrol edin."
      : "Özet veriler yüklenemedi.";
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl py-10">
        <div className="glass-card rounded-xl p-6 text-sm text-red-800 shadow-md">{loadError}</div>
      </main>
    );
  }

  const periodLinks = PERIODS.map((p) => {
    const active = p.id === data.period;
    const href = executiveDashboardHref(p.id, data.trendWindow);
    return (
      <Link
        key={p.id}
        href={href}
        scroll={false}
        className={`chip inline-flex items-center ${active ? "border-orange-500 bg-orange-50 font-semibold ring-2 ring-orange-400/70" : ""}`}
      >
        {p.label}
      </Link>
    );
  });

  const trendLinks = ([30, 90] as const).map((tw) => {
    const active = tw === data.trendWindow;
    const href = executiveDashboardHref(data.period, tw);
    return (
      <Link
        key={tw}
        href={href}
        scroll={false}
        className={`chip inline-flex items-center text-xs ${active ? "border-orange-500 bg-orange-50 font-semibold ring-2 ring-orange-400/70" : ""}`}
      >
        Son {tw} gün
      </Link>
    );
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-14 pt-4 md:space-y-8 md:pt-6">
      <header className="admin-hero-super rounded-2xl px-5 py-6 text-white shadow-lg md:px-8 md:py-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/95">
          Üst yönetim
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">İş performansı özeti</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-amber-50/95">
          Bu ekran günlük operasyon (ilan onayı, SMTP, ödeme anahtarları) için değildir; yalnızca büyüme,
          gelir/kredi ve ilan/teklif özetini gösterir. Tarihler{" "}
          <strong className="text-white">Europe/Istanbul</strong> takvimine göredir. Özet kartları seçilen
          döneme göre hesaplanır; trend grafikleri seçilen gün penceresindedir.
        </p>
      </header>

      <section className="glass-card flex flex-col gap-3 rounded-xl p-4 shadow-md md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Dönem</p>
          <div className="mt-2 flex flex-wrap gap-2">{periodLinks}</div>
          <p className="mt-2 text-xs text-slate-600">
            Özet kartları için seçilen dönem: <strong>{data.periodRange.label}</strong> (İstanbul takvimi)
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Trend penceresi</p>
          <div className="mt-2 flex flex-wrap gap-2">{trendLinks}</div>
        </div>
      </section>

      {data.alerts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-orange-950">Dikkat gerektiren</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {data.alerts.map((a) => (
              <li
                key={a.title}
                className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
                  a.severity === "warning"
                    ? "border-orange-300 bg-orange-50/90 text-orange-950"
                    : "border-slate-200 bg-white/90 text-slate-800"
                }`}
              >
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 text-xs leading-snug opacity-95">{a.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-slate-600">
          Seçilen eşiklere göre acil uyarı yok (bekleyen ilan/üye/e-fatura veya başarısız ödeme).
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-orange-950">Gelir ve kredi</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Kredi yükleme (TL)"
            value={tryFmt.format(data.creditTopUpSumTry)}
            hint="Seçilen dönemde TOP_UP toplamı"
          />
          <StatCard
            label="Ödeme kayıtları"
            value={nf.format(data.paymentByStatus.reduce((s, p) => s + p.count, 0))}
            hint="Seçilen dönemde oluşturulan siparişler"
          />
          <StatCard
            label="Başarısız ödeme"
            value={nf.format(data.failedPaymentsInPeriod)}
            hint="Seçilen dönemde FAILED"
          />
          <StatCard
            label="Bekleyen e-fatura talebi"
            value={nf.format(data.pendingCreditInvoices)}
            hint="Onay bekleyen kredi belgesi"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-semibold text-orange-950">Kredi hareketleri (tür kırılımı)</h3>
            <p className="text-xs text-slate-600">Seçilen dönem — tutar (TL)</p>
            <ul className="mt-3 divide-y divide-orange-100 text-sm">
              {data.creditByType.length === 0 ? (
                <li className="py-2 text-slate-600">Bu dönemde kredi hareketi yok.</li>
              ) : (
                data.creditByType.map((row) => (
                  <li key={row.type} className="flex justify-between gap-2 py-2">
                    <span className="text-slate-800">{row.label}</span>
                    <span className="tabular-nums font-medium text-orange-950">
                      {tryFmt.format(row.sumTry)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="glass-card rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-semibold text-orange-950">Ödeme siparişleri (durum)</h3>
            <p className="text-xs text-slate-600">Seçilen dönem — adet</p>
            <ul className="mt-3 divide-y divide-orange-100 text-sm">
              {data.paymentByStatus.length === 0 ? (
                <li className="py-2 text-slate-600">Bu dönemde ödeme kaydı yok.</li>
              ) : (
                data.paymentByStatus.map((row) => (
                  <li key={row.status} className="flex justify-between gap-2 py-2">
                    <span className="text-slate-800">{row.label}</span>
                    <span className="tabular-nums font-medium text-orange-950">{nf.format(row.count)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-orange-950">İlan ve teklif</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Yeni üye" value={nf.format(data.newMembers)} hint="Seçilen dönemde kayıt" />
          <StatCard
            label="Onay bekleyen üye"
            value={nf.format(data.pendingMembers)}
            hint="Tüm bekleyen başvurular (anlık)"
          />
          <StatCard label="Yeni ilan" value={nf.format(data.newAds)} hint="Seçilen dönemde oluşturulan" />
          <StatCard label="Beklemedeki ilan" value={nf.format(data.pendingAds)} hint="Durum: onay bekliyor" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Yayında ilan"
            value={nf.format(data.publishedAds)}
            hint="Durum: onaylı (anlık)"
          />
          <StatCard label="Teklif sayısı" value={nf.format(data.bidCount)} hint="Seçilen dönem" />
          <StatCard
            label="Teklif alan ilan"
            value={nf.format(data.bidsDistinctAds)}
            hint="Seçilen dönemde benzersiz ilan"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-orange-950">
          Trend — son {data.trendWindow} gün (günlük)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ExecutiveSparkline
            title="Yeni üye"
            subtitle="Her gün kayıt olan üye sayısı"
            accentClass="text-teal-700"
            values={data.newMembersSeries}
            formatY={(n) => nf.format(n)}
          />
          <ExecutiveSparkline
            title="Kredi yükleme"
            subtitle="TOP_UP tutarı (TL)"
            accentClass="text-orange-800"
            values={data.creditTopUpSeriesTry}
            formatY={(n) => tryFmt.format(n)}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ExecutiveProvinceBars
          title="İlan — il dağılımı"
          subtitle={`Trend penceresinde oluşturulan ilanlar (${data.trendWindow} gün)`}
          rows={data.topProvincesByAds}
        />
        <ExecutiveProvinceBars
          title="Üye — ikamet ili"
          subtitle="Profilde il bilgisi dolu üyeler (anlık)"
          rows={data.topProvincesByMembers}
        />
      </section>
    </main>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass-card rounded-xl p-4 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-orange-950 md:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-600">{hint}</p> : null}
    </div>
  );
}
