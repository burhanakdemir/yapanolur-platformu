import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import TeamAdminsClient from "./team-admins-client";

export default async function AdminTeamPage() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="chip inline-flex w-fit items-center gap-1 border-orange-300/80 bg-white/90 font-medium text-orange-900 shadow-sm transition hover:border-orange-400 hover:shadow"
          href="/admin"
        >
          ← Yönetici paneli
        </Link>
      </div>

      <header className="admin-hero-super rounded-2xl px-6 py-8 text-white md:px-10 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/95">Süper yönetici</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Yönetici ekibi</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-amber-50/95">
          Yardımcı yönetici ekleyin, şifrelerini belirleyin veya hesapları kaldırın. Toplam en fazla 3 yönetici
          hesabı olabilir.
        </p>
      </header>

      <TeamAdminsClient />
    </main>
  );
}
