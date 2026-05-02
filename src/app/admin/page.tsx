import Link from "next/link";
import { cookies } from "next/headers";

/** Oturum çerezini her istekte taze oku; önbellek / LAN girişi tutmama sorunlarını önler. */
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { verifySessionToken } from "@/lib/auth";
import { hasFullAdminAccess } from "@/lib/adminAccessServer";
import { verifyAdminMfaPendingToken, ADMIN_MFA_PENDING_COOKIE } from "@/lib/adminMfaPending";
import { getAdminPanelMode, isSuperAdminRole } from "@/lib/adminRoles";
import AdminSuperTeamPanel from "./admin-super-team-panel";
import AdminGateDevHint from "./admin-gate-dev-hint";
import AdminGateLogout from "./admin-gate-logout";
import AdminPasswordForm from "./admin-password-form";
import AdminMfaPanel from "./admin-mfa-panel";
import SuperAdminLoginForm from "./super-admin-login-form";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import { isLikelyDatabaseConnectionError } from "@/lib/dbErrors";
import { getPrismaClient, prisma } from "@/lib/prisma";
import { countPendingCreditInvoiceRequests } from "@/lib/prismaCreditInvoice";
import { adminUrl } from "@/lib/adminUrls";
import AdminDashboardNav from "./admin-dashboard-nav";
import AdminStaffScopeBanner from "./admin-staff-scope-banner";

async function getPendingSnapshot() {
  const [
    pendingAdsCount,
    pendingMembersCount,
    pendingCreditInvoicesCount,
    recentAds,
    recentMembers,
  ] = await Promise.all([
    prisma.ad.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "MEMBER", isMemberApproved: false } }),
    countPendingCreditInvoiceRequests(),
    prisma.ad.findMany({
      where: { status: "PENDING" },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.user.findMany({
      where: { role: "MEMBER", isMemberApproved: false },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  let sponsorPendingCount = 0;
  let recentSponsorPurchases: Array<{
    id: string;
    periodDays: number;
    amountTryPaid: number;
    user: { email: string; name: string | null; memberNumber: number };
  }> = [];
  try {
    const pdb = getPrismaClient();
    const sp = await Promise.all([
      pdb.sponsorHeroPurchaseRequest.count({ where: { status: "PENDING" } }),
      pdb.sponsorHeroPurchaseRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 6,
        select: {
          id: true,
          periodDays: true,
          amountTryPaid: true,
          user: { select: { email: true, name: true, memberNumber: true } },
        },
      }),
    ]);
    sponsorPendingCount = sp[0];
    recentSponsorPurchases = sp[1];
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[admin] Sponsor bekleyen özeti okunamadı (migration / DB / prisma):", e);
    }
    sponsorPendingCount = 0;
    recentSponsorPurchases = [];
  }

  return {
    pendingAdsCount,
    pendingMembersCount,
    pendingCreditInvoicesCount,
    sponsorPendingCount,
    recentAds,
    recentMembers,
    recentSponsorPurchases,
  };
}

async function getPendingSnapshotSafe(): Promise<
  Awaited<ReturnType<typeof getPendingSnapshot>> & { dbError: boolean }
> {
  try {
    const data = await getPendingSnapshot();
    return { ...data, dbError: false };
  } catch (e) {
    if (isLikelyDatabaseConnectionError(e)) {
      return {
        pendingAdsCount: 0,
        pendingMembersCount: 0,
        pendingCreditInvoicesCount: 0,
        sponsorPendingCount: 0,
        recentAds: [],
        recentMembers: [],
        recentSponsorPurchases: [],
        dbError: true,
      };
    }
    throw e;
  }
}

export default async function AdminPage() {
  const ok = await hasFullAdminAccess();

  if (!ok) {
    const c = await cookies();
    const pending = await verifyAdminMfaPendingToken(c.get(ADMIN_MFA_PENDING_COOKIE)?.value);
    if (pending) {
      const row = await prisma.user.findFirst({
        where: { id: pending.userId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { email: true, adminTotpSecretEnc: true },
      });
      if (row) {
        return (
          <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center px-4 py-10">
            <AdminMfaPanel email={row.email} needsEnrollment={!row.adminTotpSecretEnc} />
            <p className="mt-8 text-center text-xs text-slate-500">
              <Link href="/" className="font-medium text-orange-700 hover:text-orange-900 hover:underline">
                ← Ana sayfaya dön
              </Link>
            </p>
          </main>
        );
      }
    }

    const devHints =
      process.env.NODE_ENV === "development"
        ? {
            email: process.env.DEV_SUPER_ADMIN_HINT_EMAIL?.trim() || null,
            password: process.env.DEV_SUPER_ADMIN_HINT_PASSWORD?.trim() || null,
          }
        : { email: null as string | null, password: null as string | null };

    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-10">
        <div className="admin-hero mb-6 rounded-2xl px-6 py-8 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-100">Mühendisİlan</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Yönetici girişi</h1>
          <p className="mt-3 text-sm text-orange-50/95">
            Önce şifre ile doğrulama; ardından <strong className="text-white">Authenticator (TOTP)</strong> kodu
            gerekir. Sol kartta süper yönetici hesap şifresi veya yönetici{" "}
            <strong className="text-white">e-posta + şifre</strong>; sağda rol özeti.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card flex flex-col rounded-2xl p-6 shadow-lg">
            <h2 className="border-b border-orange-200/80 pb-2 text-sm font-semibold text-orange-950">
              Süper yönetici şifresi
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              <code className="rounded bg-orange-50 px-1">SUPER_ADMIN</code> rolündeki hesabın giriş şifresi (üye
              oturumu açılır; ortam değişkeni değil, veritabanındaki şifre).
            </p>
            <div className="mt-4">
              <Suspense fallback={<p className="text-sm text-slate-500">Yükleniyor…</p>}>
                <AdminPasswordForm />
              </Suspense>
            </div>

            <div className="my-5 border-t border-orange-200/80 pt-5">
              <h3 className="text-sm font-semibold text-orange-950">E-posta ve şifre (yönetici hesabı)</h3>
              <p className="mt-1.5 text-xs text-slate-600">
                <code className="rounded bg-orange-50 px-1">ADMIN</code> veya{" "}
                <code className="rounded bg-orange-50 px-1">SUPER_ADMIN</code> rolü ile üye girişi; panel şifresi
                gerekmez.
              </p>
              {process.env.NODE_ENV === "development" ? (
                <div className="mt-3">
                  <AdminGateDevHint email={devHints.email} password={devHints.password} />
                </div>
              ) : null}
              <div className="mt-3">
                <SuperAdminLoginForm
                  defaultEmail={devHints.email ?? ""}
                  defaultPassword={devHints.password ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col rounded-2xl p-6 shadow-lg ring-2 ring-amber-400/40">
            <h2 className="border-b border-amber-300/80 pb-2 text-sm font-semibold text-amber-950">
              Yönetici türleri
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-800">İki aşama:</strong> Şifre doğrulandıktan sonra Authenticator ile 6
              haneli kod (ilk girişte QR ile kurulum).{" "}
              <strong className="text-slate-800">Süper şifre / e-posta:</strong> Veritabanındaki yönetici hesabı;
              roller panele göre modülleri açar.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-4 text-xs text-slate-600">
              <li>
                <code className="rounded bg-amber-50 px-1">SUPER_ADMIN</code> — Ekip/alt yönetici yönetimi
              </li>
              <li>
                <code className="rounded bg-amber-50 px-1">ADMIN</code> — Yardımcı yönetici, çoğu modül
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Parolayı unuttuysanız: ortam/veritabanı yöneticisi veya seed/süper yönetici üzerinden sıfırlanır.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/" className="font-medium text-orange-700 hover:text-orange-900 hover:underline">
            ← Ana sayfaya dön
          </Link>
        </p>
      </main>
    );
  }

  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);

  const {
    pendingAdsCount,
    pendingMembersCount,
    pendingCreditInvoicesCount,
    sponsorPendingCount,
    recentAds,
    recentMembers,
    recentSponsorPurchases,
    dbError,
  } = await getPendingSnapshotSafe();

  const isSuper = isSuperAdminRole(session?.role);
  const navMode = getAdminPanelMode(session?.role);
  const isStaff = session?.role === "ADMIN";
  const heroClass = isSuper ? "admin-hero-super" : isStaff ? "admin-hero-staff" : "admin-hero";
  const heroKicker = isSuper
    ? "Süper yönetici"
    : isStaff
      ? "Yardımcı yönetici"
      : "Kontrol merkezi";
  const heroKickerClass = isSuper
    ? "text-amber-100/95"
    : isStaff
      ? "text-teal-100/95"
      : "text-orange-100/90";
  const bodyTextClass = isSuper ? "text-amber-50/95" : isStaff ? "text-teal-50/95" : "text-orange-50/95";
  const strongTextClass = isSuper ? "text-amber-50" : isStaff ? "text-teal-50" : "text-white";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 px-4 py-4 md:px-6 md:py-5">
      {dbError ? (
        <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <strong>Veritabanına şu an ulaşılamıyor.</strong> Bekleyen sayılar 0 gösterilir. Yerel geliştirmede
          proje kökünde{" "}
          <code className="rounded bg-white px-1">npm run db:doctor</code> çalıştırıp hatayı okuyun.
          Ayrıntı: <code className="rounded bg-white px-1">docs/baglanti-sorun-giderme.md</code>
          {" · "}
          barındırma / <code className="font-mono">DATABASE_URL</code>:{" "}
          <code className="rounded bg-white px-1">docs/hosting.md</code>
        </div>
      ) : null}

      {isStaff && session ? (
        <AdminStaffScopeBanner session={session} />
      ) : null}

      <header className={`${heroClass} rounded-xl px-4 py-3 text-white md:px-5 md:py-4`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${heroKickerClass}`}>{heroKicker}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Yönetici paneli</h1>
        <p className={`mt-2 max-w-2xl text-xs leading-snug md:text-sm md:leading-relaxed ${bodyTextClass}`}>
          {isSuper
            ? "Süper yönetici oturumundasınız. Aşağıdaki bölümden alt yönetici hesaplarını yönetin; tüm modüllere erişiminiz vardır."
            : isStaff
              ? "Yardımcı yönetici (ADMIN) hesabıyla girdiniz. Panel modülleri; süper yönetici yedek/ekip bölümleri size kapalı olabilir."
              : "Site içeriği, üyelik, ilanlar ve ödeme kurallarını buradan yönetin. Panel şifresi oturumunda sınırlı yetki uygulanabilir."}
        </p>
        {isSuper ? (
          <p
            className={`mt-2 max-w-2xl rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs leading-snug backdrop-blur-sm md:text-sm ${bodyTextClass}`}
          >
            <strong className={strongTextClass}>İpucu:</strong> Üst şerit ve{" "}
            <strong className={strongTextClass}>Yönetici ekibi / Alt yöneticiler</strong> bölümünden yardımcı
            yönetici ekleyip çıkarabilirsiniz.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start lg:gap-4 xl:gap-5">
        <div className="min-w-0 space-y-3 lg:space-y-4">
          <AdminDashboardNav mode={navMode} />

          {recentAds.length > 0 || recentMembers.length > 0 || recentSponsorPurchases.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {recentAds.length > 0 ? (
                <div className="glass-card rounded-xl p-3 shadow-md md:p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
                    Son ilanlar (beklemede)
                  </h3>
                  <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
                    {recentAds.map((ad) => (
                      <li key={ad.id} className="truncate border-b border-orange-100/90 pb-2 last:border-0 last:pb-0">
                        <Link href={adminUrl("/listings")} className="text-orange-900 hover:underline">
                          {displayAdTitle(ad.title)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {recentMembers.length > 0 ? (
                <div className="glass-card rounded-xl p-3 shadow-md md:p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
                    Son üyeler (onay bekliyor)
                  </h3>
                  <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
                    {recentMembers.map((u) => (
                      <li key={u.id} className="truncate border-b border-orange-100/90 pb-2 last:border-0 last:pb-0">
                        <Link href={adminUrl("/members")} className="text-orange-900 hover:underline">
                          {u.name || u.email}
                        </Link>
                        {u.name ? <span className="block truncate text-xs text-slate-500">{u.email}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {recentSponsorPurchases.length > 0 ? (
                <div className="glass-card rounded-xl p-3 shadow-md md:p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
                    Sponsorluk (onay bekliyor)
                  </h3>
                  <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
                    {recentSponsorPurchases.map((row) => (
                      <li key={row.id} className="truncate border-b border-orange-100/90 pb-2 last:border-0 last:pb-0">
                        <Link href={adminUrl("/sponsor-purchases")} className="text-orange-900 hover:underline">
                          №{row.user.memberNumber} · {row.periodDays} gün · {row.amountTryPaid.toLocaleString("tr-TR")} ₺
                        </Link>
                        <span className="block truncate text-[10px] text-slate-500">{row.user.name || row.user.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-1rem)] lg:overflow-y-auto">
          <div className="glass-card rounded-xl p-3 shadow-md md:p-3">
            <h2 className="border-b border-orange-200/80 pb-1.5 text-xs font-semibold uppercase tracking-wide text-orange-950">
              Bekleyen talepler
            </h2>

            <div className="mt-2 space-y-1.5">
              <Link
                href={adminUrl("/listings")}
                className="admin-stat-tile flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium leading-snug text-orange-950 transition hover:ring-2 hover:ring-orange-300/60"
              >
                <span>Yeni ilan talebi</span>
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums shadow-sm">
                  {pendingAdsCount}
                </span>
              </Link>
              <Link
                href={adminUrl("/members")}
                className="admin-stat-tile flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium leading-snug text-orange-950 transition hover:ring-2 hover:ring-orange-300/60"
              >
                <span>Yeni üye talebi</span>
                <span className="rounded-full bg-gradient-to-r from-amber-600 to-orange-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums shadow-sm">
                  {pendingMembersCount}
                </span>
              </Link>
              <Link
                href={adminUrl("/sponsor-purchases")}
                className="admin-stat-tile flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium leading-snug text-orange-950 transition hover:ring-2 hover:ring-orange-300/60"
              >
                <span>Sponsorluk onayı</span>
                <span className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums shadow-sm">
                  {sponsorPendingCount}
                </span>
              </Link>
              <Link
                href={adminUrl("/credit-invoices")}
                className="admin-stat-tile flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium leading-snug text-orange-950 transition hover:ring-2 hover:ring-orange-300/60"
              >
                <span>Bekleyen faturalar</span>
                <span className="rounded-full bg-gradient-to-r from-slate-600 to-slate-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums shadow-sm">
                  {pendingCreditInvoicesCount}
                </span>
              </Link>
              {isSuper ? (
                <>
                  <Link
                    href={adminUrl("/odeme")}
                    className="admin-stat-tile mt-0.5 flex items-center justify-between rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2 py-2 text-[13px] font-semibold leading-snug text-emerald-950 transition hover:ring-2 hover:ring-emerald-300/60"
                  >
                    <span>Ödeme (iyzico / PayTR)</span>
                    <span className="text-emerald-700" aria-hidden>
                      →
                    </span>
                  </Link>
                  <Link
                    href={adminUrl("/signup-sms-provider")}
                    className="admin-stat-tile mt-0.5 flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/90 px-2 py-2 text-[13px] font-semibold leading-snug text-amber-950 transition hover:ring-2 hover:ring-amber-300/60"
                  >
                    <span>Kayıt telefon SMS</span>
                    <span className="text-amber-800" aria-hidden>
                      →
                    </span>
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {isSuper ? (
            <div className="w-full">
              <AdminSuperTeamPanel />
            </div>
          ) : null}
        </aside>
      </div>

      <AdminGateLogout />
    </main>
  );
}
