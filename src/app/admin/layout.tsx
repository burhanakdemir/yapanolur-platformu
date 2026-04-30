import type { ReactNode } from "react";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";

/** Admin panelleri önbelleğe alınmasın; yerelde güncel JS/HTML görülsün. */
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getAdminPanelMode, isSuperAdminRole } from "@/lib/adminRoles";
import AdminQuickNav from "./admin-quick-nav";
import AdminSideNav from "./admin-side-nav";
import AdminSuperNav from "./admin-super-nav";

/** Ana sayfa ile aynı sıcak gradient zemin; tüm /admin alt sayfalarına uygulanır. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  const showTeam = isSuperAdminRole(session?.role);
  const panelMode = getAdminPanelMode(session?.role);
  const canvasClass =
    panelMode === "super"
      ? "admin-canvas admin-canvas--super"
      : panelMode === "staff"
        ? "admin-canvas admin-canvas--staff"
        : "admin-canvas admin-canvas--panel";

  return (
    <div className={`${canvasClass} min-h-screen`}>
      {showTeam ? <AdminSuperNav /> : null}
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-4 pb-1 pt-2 md:px-6 md:pt-3">
          <HomeBackButtonLink href="/">← Ana Sayfa</HomeBackButtonLink>
        </div>
        <div className="flex w-full flex-col lg:flex-row lg:items-stretch">
          <AdminSideNav showTeam={showTeam} mode={panelMode} />
          <div className="min-w-0 flex-1">
            <AdminQuickNav mode={panelMode} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
