import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { adminUrl } from "@/lib/adminUrls";
import { displayAdDescription, displayAdTitle } from "@/lib/adTitleDisplay";
import { prisma } from "@/lib/prisma";

function fmt(iso: Date | string | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await hasFullAdminAccess())) {
    redirect(`${adminUrl()}?next=${encodeURIComponent(adminUrl(`/listings/${id}`))}`);
  }

  const ad = await prisma.ad.findUnique({
    where: { id },
    include: {
      owner: {
        include: {
          memberProfile: {
            select: {
              phone: true,
              province: true,
              district: true,
              profession: { select: { name: true } },
            },
          },
        },
      },
      category: true,
      photos: { orderBy: { sortOrder: "asc" } },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          bidder: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!ad) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link text-xs" href={adminUrl("/listings")}>
        ← Ilan listesi
      </Link>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{displayAdTitle(ad.title)}</h1>
      <p className="text-xs text-slate-500">
        Ilan no:{" "}
        <span className="font-mono tabular-nums font-medium text-slate-700">{ad.listingNumber}</span>
        <span className="text-slate-400"> · </span>
        <span className="text-slate-400">ID: </span>
        <code className="rounded bg-white/80 px-1 text-[10px]">{ad.id}</code>
        <span className="text-slate-400"> · </span>
        Durum: <span className="font-medium">{ad.status}</span>
      </p>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Genel</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Aciklama</dt>
          <dd className="whitespace-pre-wrap text-slate-800">{displayAdDescription(ad.description)}</dd>
          <dt className="text-slate-500">Baslangic fiyati</dt>
          <dd className="tabular-nums">{ad.startingPriceTry.toLocaleString("tr-TR")} ₺</dd>
          <dt className="text-slate-500">Muzayede bitisi</dt>
          <dd>{ad.auctionEndsAt ? fmt(ad.auctionEndsAt) : "—"}</dd>
          <dt className="text-slate-500">Kategori</dt>
          <dd>{ad.category?.name ?? "—"}</dd>
          <dt className="text-slate-500">Vitrin bitisi</dt>
          <dd>{ad.showcaseUntil ? fmt(ad.showcaseUntil) : "Yok"}</dd>
          <dt className="text-slate-500">Olusturulma</dt>
          <dd>{fmt(ad.createdAt)}</dd>
          <dt className="text-slate-500">Guncelleme</dt>
          <dd>{fmt(ad.updatedAt)}</dd>
        </dl>
      </section>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Konum</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Il / ilce / mahalle</dt>
          <dd>
            {ad.city}, {ad.province} / {ad.district} / {ad.neighborhood}
          </dd>
          <dt className="text-slate-500">Ada / parsel</dt>
          <dd>
            {[ad.blockNo, ad.parcelNo].filter(Boolean).join(" / ") || "—"}
          </dd>
        </dl>
      </section>

      <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ilan sahibi</h2>
        <dl className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">E-posta</dt>
          <dd>{ad.owner.email}</dd>
          <dt className="text-slate-500">Ad</dt>
          <dd>{ad.owner.name ?? "—"}</dd>
          <dt className="text-slate-500">Telefon</dt>
          <dd>{ad.owner.memberProfile?.phone ?? "—"}</dd>
          <dt className="text-slate-500">Il / ilce (uye)</dt>
          <dd>
            {[ad.owner.memberProfile?.province, ad.owner.memberProfile?.district].filter(Boolean).join(" / ") ||
              "—"}
          </dd>
          <dt className="text-slate-500">Meslek</dt>
          <dd>{ad.owner.memberProfile?.profession?.name ?? "—"}</dd>
        </dl>
      </section>

      {ad.photos.length > 0 ? (
        <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotograflar</h2>
          <div className="flex flex-wrap gap-2">
            {ad.photos.map((ph) => (
              <a
                key={ph.id}
                href={ph.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-28 w-40 overflow-hidden rounded-lg border border-orange-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- harici yukleme URL */}
                <img src={ph.url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {ad.bids.length > 0 ? (
        <section className="glass-card space-y-2 rounded-xl p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Teklifler ({ad.bids.length})
          </h2>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-orange-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-orange-50/95">
                <tr className="border-b border-orange-200">
                  <th className="p-2 font-medium">Tarih</th>
                  <th className="p-2 font-medium">Tutar</th>
                  <th className="p-2 font-medium">Teklif veren</th>
                </tr>
              </thead>
              <tbody>
                {ad.bids.map((b) => (
                  <tr key={b.id} className="border-b border-orange-100/80">
                    <td className="p-2 tabular-nums text-slate-600">{fmt(b.createdAt)}</td>
                    <td className="p-2 font-medium tabular-nums">{b.amountTry.toLocaleString("tr-TR")} ₺</td>
                    <td className="p-2">
                      {b.bidder.name || b.bidder.email}
                      <span className="block text-[10px] text-slate-500">{b.bidder.email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-xs text-slate-500">Bu ilana henuz teklif yok.</p>
      )}

      <p className="text-center text-xs">
        <Link href={`/ads/${ad.id}`} className="text-orange-900 underline" target="_blank">
          Kamuya acik ilan sayfasi
        </Link>
      </p>
    </main>
  );
}
