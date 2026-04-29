"use client";

import Link from "next/link";

/** Veritabanında SUPER_ADMIN vb. değer varken Prisma istemcisi eskiyse oluşur. */
export default function PrismaEnumMismatchHelpCard() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl border border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-amber-950">Prisma istemcisi şema ile uyumsuz</h1>
        <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
          Veritabanında <code className="rounded bg-white px-1">SUPER_ADMIN</code> gibi bir rol var ama
          derlenen Prisma kodu bu değeri tanımıyor. Genelde{" "}
          <strong className="font-semibold">Turbopack önbelleği</strong> eski istemciyi tuttuğu için olur.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-amber-950/95">
          <li>
            Proje kökünde:{" "}
            <code className="rounded bg-white px-1">npx prisma generate</code>
          </li>
          <li>
            Önbelleği silin:{" "}
            <code className="rounded bg-white px-1">npm run clean</code> (veya <code className="rounded bg-white px-1">.next</code>{" "}
            klasörünü silin)
          </li>
          <li>
            Geliştirme sunucusunu durdurup yeniden başlatın:{" "}
            <code className="rounded bg-white px-1">npm run dev</code>
          </li>
        </ol>
        <p className="mt-4 text-xs text-amber-900/85">
          Hepsi bir arada: <code className="rounded bg-white px-1">npm run dev:fresh</code>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm font-medium text-orange-800 underline">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
