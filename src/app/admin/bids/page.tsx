import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/adminGate";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import AdminGateLogout from "../admin-gate-logout";

async function hasAdminAccess(): Promise<boolean> {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (isStaffAdminRole(session?.role)) return true;
  return verifyAdminGateToken(c.get(ADMIN_GATE_COOKIE)?.value);
}

function categoryPath(cat: { name: string; parent: { name: string } | null } | null): string | null {
  if (!cat) return null;
  if (cat.parent) return `${cat.parent.name} / ${cat.name}`;
  return cat.name;
}

export default async function AdminBidsPage() {
  const ok = await hasAdminAccess();
  if (!ok) {
    redirect("/admin");
  }

  const rawAds = await prisma.ad.findMany({
    where: { status: "APPROVED", bids: { some: {} } },
    select: {
      id: true,
      listingNumber: true,
      title: true,
      province: true,
      district: true,
      category: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountTry: true,
          message: true,
          createdAt: true,
          bidder: {
            select: {
              id: true,
              email: true,
              name: true,
              memberNumber: true,
            },
          },
        },
      },
    },
  });

  const ads = [...rawAds].sort((a, b) => {
    const ta = a.bids[0]?.createdAt.getTime() ?? 0;
    const tb = b.bids[0]?.createdAt.getTime() ?? 0;
    return tb - ta;
  });

  const totalBids = ads.reduce((sum, a) => sum + a.bids.length, 0);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="chip inline-flex w-fit items-center gap-1 border-orange-300/80 bg-white/90 font-medium text-orange-900 shadow-sm transition hover:border-orange-400 hover:shadow"
          href="/admin"
        >
          ← Yönetici paneli
        </Link>
      </div>

      <header className="admin-hero rounded-2xl px-6 py-8 text-white md:px-10 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100/90">10</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Teklif verilen işler</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-orange-50">
          Her ilan için iş başlığı, konum ve kategori özeti; altında o ilana ait tüm teklifler ve teklif
          veren üyeler.
        </p>
        <p className="mt-3 text-sm font-medium text-orange-100/95">
          {ads.length} ilanda toplam {totalBids} teklif
        </p>
      </header>

      <div className="space-y-2">
        {ads.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-600 shadow-md">
            Henüz teklif kaydı yok.
          </div>
        ) : (
          ads.map((ad) => {
            const cat = categoryPath(ad.category);
            const locationLine = [ad.district, ad.province].filter(Boolean).join(" / ");
            const metaBits = [locationLine, cat].filter(Boolean);
            const metaLine = metaBits.length > 0 ? metaBits.join(" — ") : null;
            return (
              <article
                key={ad.id}
                className="glass-card rounded-xl border border-orange-100/80 p-2.5 shadow-sm sm:p-3"
              >
                {/* Tek sıra: başlık + özet + ilan linki */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-orange-200/60 pb-1.5 text-[11px] leading-tight text-orange-950 sm:flex-nowrap">
                  <Link
                    href={`/ads/${ad.id}`}
                    className="min-w-0 max-w-full shrink font-semibold text-orange-950 hover:underline sm:max-w-[min(100%,42rem)] sm:truncate"
                  >
                    {displayAdTitle(ad.title)}
                  </Link>
                  <span className="shrink-0 text-slate-400" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">№{ad.listingNumber}</span>
                  {metaLine ? (
                    <>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-600" title={metaLine}>
                        {metaLine}
                      </span>
                    </>
                  ) : null}
                  <Link
                    href={`/ads/${ad.id}`}
                    className="ml-auto shrink-0 whitespace-nowrap text-[11px] font-semibold text-orange-700 underline decoration-orange-300/80 underline-offset-2 hover:text-orange-900"
                  >
                    İlan →
                  </Link>
                </div>

                {/* Teklifler: satır başına tek sıra, küçük punto */}
                <ul className="mt-1 divide-y divide-orange-100/80">
                  {ad.bids.map((bid) => {
                    const bidderLabel =
                      bid.bidder.name?.trim() || bid.bidder.email || "—";
                    const when = bid.createdAt.toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const msg = bid.message?.trim();
                    return (
                      <li
                        key={bid.id}
                        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 py-0.5 text-[11px] leading-tight"
                      >
                        <span className="max-w-[14rem] shrink-0 truncate font-medium text-orange-950">
                          {bidderLabel}
                        </span>
                        {bid.bidder.name?.trim() ? (
                          <span className="max-w-[12rem] shrink-0 truncate text-slate-500" title={bid.bidder.email}>
                            {bid.bidder.email}
                          </span>
                        ) : null}
                        <span className="shrink-0 tabular-nums text-slate-500">üye {bid.bidder.memberNumber}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-orange-900">
                          {bid.amountTry.toLocaleString("tr-TR")} ₺
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-slate-500">{when}</span>
                        <span
                          className="min-w-0 flex-1 truncate text-slate-600"
                          title={msg || undefined}
                        >
                          {msg ? `“${msg}”` : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })
        )}
      </div>

      <AdminGateLogout />
    </main>
  );
}
