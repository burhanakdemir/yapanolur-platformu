"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminPanelMode } from "@/lib/adminRoles";
import { ADMIN_QUICK_LINKS } from "./admin-nav-config";

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  mode: AdminPanelMode;
};

/** Mobil / tablette üstte; lg ve üzeri gizli (sol sütun menü kullanılır). */
export default function AdminQuickNav({ mode }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden sticky top-0 z-30 border-b border-orange-200/90 bg-white/95 shadow-sm backdrop-blur-sm"
      aria-label="Yönetici hızlı gezinme"
    >
      {mode === "super" ? (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-950/95 px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/95">Süper yönetici</span>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin#super-admin-team"
              className="text-[11px] font-semibold text-amber-100 underline decoration-amber-300/80 underline-offset-2"
            >
              Alt yöneticiler
            </Link>
            <Link
              href="/admin/admins"
              className="rounded-lg border border-amber-400/60 bg-white/10 px-2 py-1 text-[11px] font-bold text-white"
            >
              Tam sayfa
            </Link>
          </div>
        </div>
      ) : null}
      {mode === "staff" ? (
        <div className="border-b border-teal-400/30 bg-teal-900/92 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-teal-100">
          Yardımcı yönetici
        </div>
      ) : null}
      {mode === "panel" ? (
        <div className="border-b border-orange-200/80 bg-orange-50/90 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-orange-900/80">
          Panel erişimi (şifre)
        </div>
      ) : null}
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin]">
        <ul className="mx-auto flex max-w-7xl min-w-min flex-nowrap items-center gap-1 px-2 py-2 sm:px-4">
          {ADMIN_QUICK_LINKS.filter((l) => !l.superOnly || mode === "super").map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 font-semibold text-white shadow-sm"
                      : "text-orange-950/90 hover:bg-orange-50"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
