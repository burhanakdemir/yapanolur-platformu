"use client";

import Link from "next/link";

/** Hem sunucu sayfalarında hem `app/error.tsx` içinde kullanılır (Turbopack/Prisma ham metni yerine). */
export default function DbConnectionHelpCard() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-amber-950">Veritabanına bağlanılamıyor</h1>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
          Uygulama <strong className="font-semibold">PostgreSQL</strong> kullanır. Bu ekran genelde sunucu
          çalışmıyorken, <code className="rounded bg-white/80 px-1">DATABASE_URL</code> yanlışken veya
          migration uygulanmamışken görünür.
        </p>
        <p className="mt-3 rounded-lg border border-amber-300/80 bg-white/60 px-3 py-2 text-sm text-amber-950">
          <strong>Önce terminalde:</strong>{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">npm run db:doctor</code> — bağlantıyı ve
          hatayı doğrudan gösterir. Docker yoksa{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">docs/baglanti-sorun-giderme.md</code>{" "}
          (Neon ücretsiz).
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950/95">
          <li>
            <strong>.env güncel mi?</strong> SQLite{" "}
            <code className="rounded bg-white/80 px-1">file:...</code> kullanmayın;{" "}
            <code className="rounded bg-white/80 px-1">
              postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev
            </code>{" "}
            (önce <code className="rounded bg-white/80 px-1">docker compose up -d</code>) — şablon:{" "}
            <code className="rounded bg-white/80 px-1">.env.example</code>.
          </li>
          <li>
            <strong>Yerel Docker:</strong> proje kökünde{" "}
            <code className="rounded bg-white/80 px-1">docker compose up -d</code> — Docker Desktop
            (Windows/macOS) çalışıyor olmalı. Konteyner hazır olana kadar birkaç saniye bekleyin; ardından{" "}
            <code className="rounded bg-white/80 px-1">npm run db:migrate</code>.
          </li>
          <li>
            <strong>Windows / IPv6:</strong> <code className="rounded bg-white/80 px-1">localhost</code> yerine{" "}
            <code className="rounded bg-white/80 px-1">127.0.0.1</code> kullanın (yukarıdaki örnek). Uygulama
            otomatik düzeltir; yine de <code className="rounded bg-white/80 px-1">.env</code> ile eşleştirin.
          </li>
          <li>
            <strong>Yerelde SSL:</strong> Docker içindeki Postgres çoğu zaman SSL kullanmaz. Adreste{" "}
            <code className="rounded bg-white/80 px-1">?sslmode=require</code> varsa kaldırın veya URL’yi
            sade tutun. Neon gibi barındırıcıda <code className="rounded bg-white/80 px-1">require</code>{" "}
            gerekebilir. Gerekirse <code className="rounded bg-white/80 px-1">DATABASE_SSL_DISABLE=1</code>{" "}
            ekleyin (yalnızca yerel güvenilir sunucu).
          </li>
          <li>
            <strong>Port 5432:</strong> Başka bir PostgreSQL kurulumu aynı portu kullanıyorsa çakışır; ya onu
            durdurun ya da <code className="rounded bg-white/80 px-1">docker-compose.yml</code> içinde portu
            değiştirip <code className="rounded bg-white/80 px-1">DATABASE_URL</code>’deki portu eşleştirin.
          </li>
          <li>
            <strong>Üretim (Neon, RDS):</strong> doğru host ve çoğu zaman{" "}
            <code className="rounded bg-white/80 px-1">?sslmode=require</code> —{" "}
            <code className="rounded bg-white/80 px-1">docs/vercel-neon.md</code>.
          </li>
        </ul>
        <p className="mt-4 text-xs text-amber-800/90">
          Ayrıntı: <code className="rounded bg-white/80 px-1">docs/local-db.md</code>,{" "}
          <code className="rounded bg-white/80 px-1">docs/baglanti-sorun-giderme.md</code>
        </p>
        <p className="mt-3 text-xs text-amber-800/90">
          Önbellek: <code className="rounded bg-white/80 px-1">npm run clean</code> ardından{" "}
          <code className="rounded bg-white/80 px-1">npm run dev</code>. Sorun sürerse{" "}
          <code className="rounded bg-white/80 px-1">npm run dev:webpack</code> dene.
        </p>
      </div>
      <p className="text-center text-sm text-slate-600">
        <Link href="/api/health" className="text-orange-700 underline underline-offset-2">
          /api/health
        </Link>{" "}
        — geliştirme modunda hata mesajı JSON içinde görünebilir.
      </p>
    </main>
  );
}
