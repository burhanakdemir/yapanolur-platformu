import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { adminUrl } from "@/lib/adminUrls";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { getAppUrl } from "@/lib/appUrl";
import { APPROVED_ADS_PER_SITEMAP_CHUNK } from "@/lib/sitemapAdsChunk";

function statusPill(ok: boolean, yes: string, no: string) {
  return (
    <span
      className={
        ok
          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900"
          : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950"
      }
    >
      {ok ? yes : no}
    </span>
  );
}

export default async function AdminSeoPage() {
  if (!(await hasFullAdminAccess())) {
    redirect(adminUrl());
  }
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect(adminUrl());
  }

  const base = getAppUrl();
  const googleV = Boolean(
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim(),
  );
  const bingV = Boolean(
    process.env.BING_SITE_VERIFICATION?.trim() ||
      process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim(),
  );

  const rows: { label: string; path: string; note?: string }[] = [
    { label: "robots.txt", path: "/robots.txt", note: "Tarama kuralları + sitemap adresi" },
    { label: "Sitemap indeksi", path: "/sitemap.xml", note: "Çoklu dosya: statik + ilan dilimleri" },
    { label: "RSS (son ilanlar)", path: "/rss.xml", note: "Onaylı ilanlar, RSS 2.0" },
    { label: "İnsan okunur harita", path: "/site-haritasi", note: "İç bağlantı keşfi" },
    { label: "Web manifest (PWA)", path: "/manifest.webmanifest", note: "Kurulum / ikonlar" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-6 lg:max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="chip inline-flex w-fit items-center gap-1 border-orange-300/80 bg-white/90 font-medium text-orange-900 shadow-sm transition hover:border-orange-400 hover:shadow"
          href={adminUrl()}
        >
          ← Yönetici paneli
        </Link>
      </div>

      <header className="admin-hero-super rounded-2xl px-6 py-8 text-white md:px-10 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/95">Süper yönetici</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">SEO özeti</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-50/95">
          Arama motorları, kanonik URL, site haritası, yapılandırılmış veri ve ortam değişkenleri — tek ekranda.
        </p>
      </header>

      <section className="glass-card space-y-3 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-orange-950">Kanonik site adresi (APP_URL)</h2>
        <p className="text-sm text-slate-600">
          Open Graph, canonical, sitemap ve JSON-LD mutlak URL’ler bu tabana göre üretilir. Üretimde{" "}
          <code className="rounded bg-slate-100 px-1">https://sizin-domain.com</code> olmalı; LAN testinde
          tarayıcıdaki host ile aynı olmalı.
        </p>
        <p className="break-all font-mono text-sm text-slate-800">{base}</p>
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-orange-950">Arama konsolu doğrulama (ortam)</h2>
        <p className="text-sm text-slate-600">
          HTML etiket yöntemi: <code className="rounded bg-slate-100 px-1">.env</code> içinde{" "}
          <code className="rounded bg-slate-100 px-1">GOOGLE_SITE_VERIFICATION</code> veya{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION</code>; Bing:{" "}
          <code className="rounded bg-slate-100 px-1">BING_SITE_VERIFICATION</code> veya{" "}
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_BING_SITE_VERIFICATION</code> — Bing meta adı{" "}
          <code className="rounded bg-slate-100 px-1">msvalidate.01</code>. Değişiklikten sonra yeniden derleme
          gerekir. Token’ları repoya yazmayın.
        </p>
        <ul className="flex flex-wrap gap-3 text-sm">
          <li className="flex items-center gap-2">
            Google: {statusPill(googleV, "Tanımlı", "Boş")}
          </li>
          <li className="flex items-center gap-2">
            Bing: {statusPill(bingV, "Tanımlı", "Boş")}
          </li>
        </ul>
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-orange-950">Tarama ve keşif</h2>
        <ul className="space-y-3 text-sm">
          {rows.map((r) => (
            <li
              key={r.path}
              className="flex flex-col gap-1 border-b border-orange-100/90 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-slate-900">{r.label}</span>
                {r.note ? <p className="mt-0.5 text-xs text-slate-600">{r.note}</p> : null}
              </div>
              <a
                href={`${base}${r.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm font-semibold text-orange-800 underline-offset-2 hover:underline"
              >
                Aç →
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-slate-600">
          <strong>Sitemap:</strong> <code className="rounded bg-slate-50 px-1">/sitemap.xml</code> bir indeks
          üretir. İlanlar dilimlenir: dosya başına en fazla{" "}
          <strong>{APPROVED_ADS_PER_SITEMAP_CHUNK}</strong> onaylı ilan (her ilan TR + EN = 2 URL). Statik sayfalar{" "}
          <code className="rounded bg-slate-50 px-1">id=0</code> dosyasında; ek dosyalar ilan sayısına göre eklenir.
          Yenileme: yaklaşık 1 saat (ISR).
        </p>
        <p className="text-xs leading-relaxed text-slate-600">
          <strong>robots:</strong> <code className="rounded bg-slate-50 px-1">/admin</code>,{" "}
          <code className="rounded bg-slate-50 px-1">/api</code>, <code className="rounded bg-slate-50 px-1">/panel</code>,{" "}
          ödeme ve gerekirse yönetici öneki engellenir — üretimde indekslenmesi istenmez.
        </p>
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-orange-950">Sayfa başına SEO (uygulama davranışı)</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <strong>İlan detayı</strong> (<code className="rounded bg-slate-100 px-1">/ads/[id]</code>): onaylı ilanlarda{" "}
            <code className="rounded bg-slate-100 px-1">index,follow</code>, başlık/açıklama, canonical,{" "}
            <code className="rounded bg-slate-100 px-1">hreflang</code> (tr/en), Open Graph ve Twitter kartları.
          </li>
          <li>
            <strong>Yapılandırılmış veri:</strong> Product + Offer (fiyat, TRY), BreadcrumbList (ana sayfa → kategori →
            ilan). Kök layout’ta Organization + WebSite şeması (tüm genel sayfalar).
          </li>
          <li>
            <strong>Ana sayfa filtreleri:</strong> ilçe veya mahalle seçili iken il yoksa düşük kaliteli URL sayılır;{" "}
            <code className="rounded bg-slate-100 px-1">noindex,follow</code> uygulanır.
          </li>
          <li>
            <strong>Üyelik / kayıt</strong> (<code className="rounded bg-slate-100 px-1">/members</code>):{" "}
            <code className="rounded bg-slate-100 px-1">noindex,follow</code>.
          </li>
        </ul>
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-orange-950">Harici araçlar</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-orange-800 underline-offset-2 hover:underline"
            >
              Google Search Console
            </a>
            — doğrulama, sitemap gönderimi, indeks kapsamı.
          </li>
          <li>
            <a
              href="https://www.bing.com/webmasters"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-orange-800 underline-offset-2 hover:underline"
            >
              Bing Webmaster Tools
            </a>
            — aynı kanonik domain ile.
          </li>
          <li>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-orange-800 underline-offset-2 hover:underline"
            >
              Rich Results Test
            </a>
            — yapılandırılmış veri önizlemesi (Product, breadcrumb).
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950">
        Bu sayfa yalnızca bilgilendirme ve bağlantı toplar; sıralama veya tıklama verisi göstermez. Metrikler için Search
        Console ve Analytics kullanın.
      </section>
    </main>
  );
}
