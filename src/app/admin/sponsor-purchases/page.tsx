import Link from "next/link";
import { redirect } from "next/navigation";
import { listPendingSponsorPurchaseRequests } from "@/lib/adminPendingSponsorPurchases";
import { canStaffAdminOrGateAdmin } from "@/lib/adminStaffOrGateAuth";
import { isDatabaseUrlConfigurationError } from "@/lib/databaseUrlSanity";
import { isLikelyDatabaseConnectionError } from "@/lib/dbErrors";
import { getPrismaClient } from "@/lib/prisma";
import SponsorPurchasesAdminClient from "./sponsor-purchases-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSponsorPurchasesPage() {
  if (!(await canStaffAdminOrGateAdmin())) {
    redirect("/admin");
  }

  let initialRows: Parameters<typeof SponsorPurchasesAdminClient>[0]["initialRows"];
  try {
    const prisma = getPrismaClient();
    const raw = await listPendingSponsorPurchaseRequests(prisma);
    initialRows = raw.map((r) => ({
      id: r.id,
      periodDays: r.periodDays,
      amountTryPaid: r.amountTryPaid,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    }));
  } catch (e) {
    if (isLikelyDatabaseConnectionError(e) || isDatabaseUrlConfigurationError(e)) {
      return (
        <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 md:px-6">
          <Link className="admin-back-link text-sm" href="/admin">
            ← Yönetici ana panel
          </Link>
          <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm">
            <h1 className="text-lg font-bold text-amber-950">Veritabanı bağlantısı veya kimlik bilgisi</h1>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/95">
              PostgreSQL bağlantısı reddedildi. Yaygın nedenler: yanlış kullanıcı/şifre veya{" "}
              <code className="rounded bg-white/90 px-1">DATABASE_URL</code> içinde örnek bir adres kalmış olması.
              Hata çıktısında <code className="rounded bg-white/90 px-1">credentials for `x`</code> benzeri bir ifade
              görürseniz, genelde{" "}
              <code className="rounded bg-white/90 px-1">postgresql://x:y@...</code> gibi test URL&apos;si{" "}
              <code className="rounded bg-white/90 px-1">.env</code> dosyanızda kalmış demektir; gerçek kullanıcı ve
              veritabanı ile güncelleyin.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-amber-900/95">
              Yerel Docker için örnek adres:{" "}
              <code className="rounded bg-white/90 px-1 text-[13px]">
                postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev
              </code>
              . Önce <code className="rounded bg-white/90 px-1">docker compose up -d</code>, ardından{" "}
              <code className="rounded bg-white/90 px-1">npm run db:migrate</code>. Ayrıntılar{" "}
              <code className="rounded bg-white/90 px-1">docs/local-db.md</code> dosyasında; şablon{" "}
              <code className="rounded bg-white/90 px-1">.env.example</code>.
            </p>
            <p className="mt-3 text-sm text-amber-900/95">
              Bağlantıyı doğrulamak için: <code className="rounded bg-white/90 px-1">npm run db:doctor</code>
            </p>
          </section>
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 md:px-6">
      <Link className="admin-back-link text-sm" href="/admin">
        ← Yönetici ana panel
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-amber-950 md:text-2xl">Sponsorluk onayı</h1>
        <p className="mt-1 text-xs text-slate-600 md:text-sm">
          Üyelerin bakiyeden ödediği veya ücretsiz paket başvuruları burada bekler. Onayladığınızda TR şerit satırı
          oluşur ve süre başlar; reddettiğinizde tahsilat bakiyeye iade edilir (ücretsiz başvurularda iade yoktur).
        </p>
      </header>
      <SponsorPurchasesAdminClient initialRows={initialRows} />
    </main>
  );
}
