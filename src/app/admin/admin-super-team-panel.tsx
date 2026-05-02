import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";
import TeamAdminsClient from "./admins/team-admins-client";

/**
 * Süper yönetici ana panelinde: alt yönetici oluşturma bölümü (tam genişlik, belirgin).
 */
export default function AdminSuperTeamPanel() {
  return (
    <section
      id="super-admin-team"
      className="glass-card w-full scroll-mt-28 rounded-xl border-2 border-amber-500/50 p-3.5 text-left shadow-md md:p-4 md:shadow-lg"
      aria-labelledby="super-admin-team-title"
    >
      <div className="flex flex-col gap-3 border-b border-amber-200/90 pb-4 text-left sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900/75">Süper yönetici alanı</p>
          <h2 id="super-admin-team-title" className="mt-1 text-lg font-bold text-amber-950 md:text-xl">
            Alt yönetici hesapları
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-amber-950/90 md:text-sm">
            Yardımcı yönetici ekleyin (en fazla 100), şifre belirleyin veya kaldırın. Bu hesaplar üye girişiyle panele
            erişir; süper yöneticiye özel bölümler hariç tüm yönetim modüllerini kullanabilirler.
          </p>
        </div>
        <Link
          href={adminUrl("/admins")}
          className="shrink-0 self-start rounded-xl border border-amber-300 bg-white px-3 py-2 text-center text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
        >
          Tam sayfa yönetimi →
        </Link>
      </div>
      <div className="mt-4">
        <TeamAdminsClient embedded compact />
      </div>
    </section>
  );
}
