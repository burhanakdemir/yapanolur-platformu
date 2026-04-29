"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminPanelMode } from "@/lib/adminRoles";
import {
  ADMIN_SECTION_GROUPS,
  ADMIN_TEAM_SECTION,
  filterNavGroupsByMode,
} from "./admin-nav-config";

function active(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MODE_BADGE: Record<AdminPanelMode, { className: string; label: string }> = {
  super: {
    className: "border-amber-600/50 bg-amber-950/92 text-amber-100",
    label: "Süper yönetici",
  },
  staff: {
    className: "border-teal-600/45 bg-teal-900/90 text-teal-50",
    label: "Yardımcı yönetici",
  },
  panel: {
    className: "border-slate-300/90 bg-slate-100/95 text-slate-700",
    label: "Panel erişimi",
  },
};

type Props = {
  /** Süper yönetici: ekibe kısayol */
  showTeam: boolean;
  mode: AdminPanelMode;
};

export default function AdminSideNav({ showTeam, mode }: Props) {
  const pathname = usePathname();
  const sectionGroups = filterNavGroupsByMode(ADMIN_SECTION_GROUPS, mode);
  const badge = MODE_BADGE[mode];
  const railTint =
    mode === "super"
      ? "border-amber-300/50 from-white/98 to-amber-50/40"
      : mode === "staff"
        ? "border-teal-200/60 from-white/98 to-teal-50/35"
        : "border-orange-200/80 from-white/95 to-orange-50/30";

  return (
    <aside
      className={`hidden w-[220px] shrink-0 border-b bg-gradient-to-b ${railTint} lg:sticky lg:top-0 lg:block lg:self-start lg:border-b-0 lg:border-r lg:px-1 lg:pt-6 lg:pb-4`}
      aria-label="Yönetici bölümleri"
    >
      <div
        className={`mx-1 mb-3 rounded-lg border px-2 py-2 text-center text-[9px] font-bold uppercase leading-tight tracking-wide ${badge.className}`}
        role="status"
      >
        {badge.label}
      </div>
      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-orange-800/80">Bölümler</p>
      <div className="max-h-[min(100dvh-6rem,900px)] space-y-3 overflow-y-auto pr-0.5 lg:pl-0">
        {showTeam ? (
          <div className="rounded-xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-50/95 to-white/90 p-2.5 shadow-lg ring-2 ring-amber-500/20">
            <Link
              href={ADMIN_TEAM_SECTION.href}
              className={
                active(pathname, ADMIN_TEAM_SECTION.href)
                  ? "block rounded-lg border-2 border-amber-500 bg-amber-100 px-2.5 py-2.5 text-sm font-bold text-amber-950 shadow-md"
                  : "block rounded-lg border border-amber-300/90 bg-white px-2.5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:border-amber-400 hover:shadow"
              }
            >
              {ADMIN_TEAM_SECTION.title}
            </Link>
            <p className="mt-1.5 px-0.5 text-[10px] font-medium leading-snug text-amber-900/90">
              {ADMIN_TEAM_SECTION.description}
            </p>
          </div>
        ) : null}
        {sectionGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border-2 border-orange-300/90 bg-gradient-to-b from-white to-orange-50/50 p-2.5 shadow-md ring-1 ring-orange-400/35"
          >
            <h3 className="mb-2.5 border-b-2 border-orange-200/90 pb-2 pl-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-900">
              {group.label}
            </h3>
            <ul className="space-y-1.5">
              {group.sections.map((s) => {
                const on = active(pathname, s.href);
                return (
                  <li key={s.id}>
                    <Link
                      href={s.href}
                      className={
                        on
                          ? "block rounded-lg border-2 border-orange-400 bg-gradient-to-r from-orange-500 to-amber-600 px-2.5 py-2 text-sm font-semibold text-white shadow-md"
                          : "block rounded-lg border border-orange-200/80 bg-white/90 px-2.5 py-2 text-sm font-medium text-orange-950 shadow-sm transition hover:border-orange-300 hover:bg-amber-50/90 hover:shadow"
                      }
                    >
                      {s.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
