"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PublicEngineerRow } from "@/lib/engineerDirectory";
import MemberContactModal from "@/components/MemberContactModal";

export default function EngineerDirectoryResults({
  engineers,
  lang,
}: {
  engineers: PublicEngineerRow[];
  lang: "tr" | "en";
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const t =
    lang === "tr"
      ? {
          title: "Arama sonuçları",
          empty: "Kriterlere uygun onaylı üye bulunamadı.",
          memberNo: "Üye no",
          location: "Konum",
          profession: "Meslek",
          hint: "Profile tıklayın; iletişim için aşağıdaki düğmeyi kullanın.",
          profile: "Profil ve puan",
          contact: "İletişim bilgisi",
        }
      : {
          title: "Search results",
          empty: "No approved members match your filters.",
          memberNo: "Member no.",
          location: "Location",
          profession: "Profession",
          hint: "Open profile; use the button below for contact details.",
          profile: "Profile & rating",
          contact: "Contact details",
        };

  if (engineers.length === 0) {
    return (
      <div className="rounded-xl border border-orange-200/80 bg-orange-50/50 px-4 py-3 text-sm text-slate-700">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-orange-950">{t.title}</h3>
      <p className="text-xs text-slate-600">{t.hint}</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {engineers.map((m) => {
          const profileHref = lang === "en" ? `/uye/${m.id}?lang=en` : `/uye/${m.id}`;
          return (
            <li
              key={m.id}
              className="flex flex-col gap-2 rounded-xl border border-orange-200/90 bg-white/90 p-3 text-left shadow-sm"
            >
              <Link
                href={profileHref}
                className="flex gap-3 rounded-lg outline-none ring-orange-400 transition hover:bg-orange-50/80 focus-visible:ring-2"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-orange-100">
                  {m.profilePhotoUrl ? (
                    <Image
                      src={m.profilePhotoUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl text-orange-400">
                      👤
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold text-slate-900">{m.name || "—"}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.memberNo}: <span className="font-mono tabular-nums">{m.memberNumber}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    <span className="text-slate-500">{t.profession}: </span>
                    {m.profession?.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="text-slate-500">{t.location}: </span>
                    {[m.province, m.district].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-orange-800 underline-offset-2 hover:underline">
                    {t.profile} →
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpenId(m.id)}
                className="chip w-full justify-center py-2 text-xs font-medium"
              >
                {t.contact}
              </button>
            </li>
          );
        })}
      </ul>

      <MemberContactModal
        userId={openId}
        open={openId !== null}
        onClose={() => setOpenId(null)}
        lang={lang}
      />
    </div>
  );
}
