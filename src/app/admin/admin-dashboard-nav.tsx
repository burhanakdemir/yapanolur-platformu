"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ADMIN_SECTION_GROUPS,
  filterNavGroupsByMode,
  type AdminNavGroup,
  type AdminNavSection,
} from "./admin-nav-config";
import type { AdminPanelMode } from "@/lib/adminRoles";

function filterGroups(groups: AdminNavGroup[], query: string): AdminNavGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      sections: g.sections.filter(
        (s) =>
          s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || g.label.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.sections.length > 0);
}

type Props = { mode: AdminPanelMode };

export default function AdminDashboardNav({ mode }: Props) {
  const [query, setQuery] = useState("");
  const modeFiltered = useMemo(() => filterNavGroupsByMode(ADMIN_SECTION_GROUPS, mode), [mode]);
  const filtered = useMemo(() => filterGroups(modeFiltered, query), [modeFiltered, query]);
  const flatIndex = useMemo(() => {
    let n = 0;
    const map = new Map<string, number>();
    for (const g of filtered) {
      for (const s of g.sections) {
        n += 1;
        map.set(s.id, n);
      }
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="text-[11px] font-medium text-orange-900/80">Bölüm ara</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ör. kategori, teklif, paytr, vitrin…"
            className="mt-0.5 w-full rounded-lg border border-orange-200/90 bg-white px-2.5 py-1.5 text-[13px] leading-snug text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            autoComplete="off"
            id="admin-section-search"
          />
        </label>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 text-xs font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Aramayı temizle
          </button>
        ) : null}
      </div>

      <div id="admin-bolumler" className="space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-orange-200 bg-white/60 px-3 py-4 text-center text-xs text-slate-600">
            Sonuç yok. Farklı bir anahtar kelime deneyin.
          </p>
        ) : null}

        {filtered.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2 id={`group-${group.id}`} className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {group.label}
            </h2>
            <div className="space-y-1">
              {group.sections.map((s) => (
                <SectionCard key={s.id} section={s} index={flatIndex.get(s.id) ?? 0} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section, index }: { section: AdminNavSection; index: number }) {
  return (
    <Link href={section.href} className="admin-nav-card flex w-full gap-2 rounded-lg p-2 md:p-2.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-[11px] font-bold text-white shadow-sm ring-1 ring-orange-400/35"
        aria-hidden
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight text-orange-950">{section.title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-orange-900/85">{section.description}</p>
      </div>
      <span className="hidden shrink-0 self-center text-xs text-orange-600/90 md:block" aria-hidden>
        →
      </span>
    </Link>
  );
}
