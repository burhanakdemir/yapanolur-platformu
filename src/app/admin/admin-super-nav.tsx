import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";

/** Tüm /admin sayfalarında üstte: süper yönetici paneline hızlı erişim */
export default async function AdminSuperNav() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) return null;

  return (
    <div
      className="sticky top-0 z-40 border-b border-amber-500/50 bg-gradient-to-r from-amber-950 via-amber-900 to-orange-950 shadow-lg"
      role="navigation"
      aria-label="Süper yönetici paneli"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/95">
            Süper yönetici
          </p>
          <p className="truncate text-sm font-semibold text-white md:text-base">
            Yönetici ekibi — yardımcı admin ekle / şifre / sil
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin#super-admin-team"
            className="shrink-0 rounded-xl border border-amber-200/50 bg-amber-900/30 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-800/50"
          >
            Ana panel: alt yöneticiler
          </Link>
          <Link
            href="/admin/admins"
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-950 shadow-md transition hover:bg-amber-50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Tam sayfa →
          </Link>
        </div>
      </div>
    </div>
  );
}
