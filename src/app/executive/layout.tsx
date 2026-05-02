import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";

export const dynamic = "force-dynamic";

export default async function ExecutiveLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    redirect(adminUrl());
  }

  return (
    <div className="admin-canvas admin-canvas--super min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6 md:py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <HomeBackButtonLink href="/">← Ana Sayfa</HomeBackButtonLink>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="admin-back-link" href={adminUrl()}>
              Yönetici paneli
            </Link>
            <span className="rounded-full border border-amber-200/80 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
              Sadece süper yönetici
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
