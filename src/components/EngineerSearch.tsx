"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApiUrl } from "@/lib/clientApi";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";

type Option = { id: number; name: string };
type Profession = { id: string; name: string };

export default function EngineerSearch({
  lang,
  initial,
  basePath = "/muhendis-ara",
  mergeSearchParams = true,
}: {
  lang: "tr" | "en";
  initial: {
    province?: string;
    district?: string;
    professionId?: string;
  };
  /** Arama ve temizle yönlendirmesi (örn. `/muhendis-ara`). */
  basePath?: string;
  /** false: yalnızca arama filtreleri + dil (ana sayfadan gönderim). */
  mergeSearchParams?: boolean;
}) {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinceName, setProvinceName] = useState(initial.province || "");
  const [districtName, setDistrictName] = useState(initial.district || "");
  const [professionId, setProfessionId] = useState(initial.professionId || "");

  useEffect(() => {
    fetch(clientApiUrl("/api/locations?level=provinces"), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) && data.length > 0 ? data : TR_PROVINCES_FALLBACK;
        setProvinces(list);
        const selected = list.find((p: Option) => p.name === initial.province);
        if (selected) setProvinceId(String(selected.id));
      })
      .catch(() => setProvinces(TR_PROVINCES_FALLBACK));
  }, [initial.province]);

  useEffect(() => {
    if (!provinceId) return;
    fetch(clientApiUrl(`/api/locations?level=districts&provinceId=${provinceId}`), {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setDistricts(list);
        const selected = list.find((d: Option) => d.name === initial.district);
        if (selected) setDistrictId(String(selected.id));
      })
      .catch(() => setDistricts([]));
  }, [provinceId, initial.district]);

  useEffect(() => {
    fetch(clientApiUrl("/api/professions"), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => setProfessions(Array.isArray(data) ? data : []))
      .catch(() => setProfessions([]));
  }, []);

  const provinceOptions = useMemo(() => provinces, [provinces]);
  const districtOptions = useMemo(() => districts, [districts]);
  const districtDisabled = !provinceId;

  function mergeAndPush(next: {
    engProvince?: string;
    engDistrict?: string;
    engProfessionId?: string;
    clearEngineer?: boolean;
  }) {
    const q = mergeSearchParams
      ? new URLSearchParams(
          typeof window !== "undefined" ? window.location.search : "",
        )
      : new URLSearchParams();
    if (next.clearEngineer) {
      q.delete("engProvince");
      q.delete("engDistrict");
      q.delete("engProfessionId");
    } else {
      if (next.engProvince !== undefined) {
        if (next.engProvince) q.set("engProvince", next.engProvince);
        else q.delete("engProvince");
      }
      if (next.engDistrict !== undefined) {
        if (next.engDistrict) q.set("engDistrict", next.engDistrict);
        else q.delete("engDistrict");
      }
      if (next.engProfessionId !== undefined) {
        if (next.engProfessionId) q.set("engProfessionId", next.engProfessionId);
        else q.delete("engProfessionId");
      }
    }
    q.set("lang", lang);
    const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
    router.push(`${path}?${q.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = provinceName.trim();
    const d = districtName.trim();
    const pr = professionId.trim();
    if (!p && !d && !pr) {
      mergeAndPush({ clearEngineer: true });
      return;
    }
    mergeAndPush({
      engProvince: p,
      engDistrict: d,
      engProfessionId: pr,
    });
  }

  const labels =
    lang === "tr"
      ? {
          title: "Meslek Sahibi Ara",
          hint: "En az bir alan seçin (il, ilçe ve/veya meslek).",
          province: "İl",
          district: "İlçe",
          profession: "Meslek",
          search: "Ara",
          clear: "Temizle",
          allProf: "Tüm meslekler",
        }
      : {
          title: "Find professionals",
          hint: "Pick at least one filter (province, district, and/or profession).",
          province: "Province",
          district: "District",
          profession: "Profession",
          search: "Search",
          clear: "Clear",
          allProf: "All professions",
        };

  const fieldClass =
    "w-full touch-manipulation rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base leading-tight min-h-[44px] sm:min-h-0 sm:px-2 sm:py-1.5 sm:text-sm";

  return (
    <form className="space-y-2 sm:space-y-1.5" onSubmit={onSubmit}>
      <select
        className={fieldClass}
        value={provinceId}
        onChange={(e) => {
          const nextId = e.target.value;
          setProvinceId(nextId);
          const p = provinceOptions.find((x) => String(x.id) === nextId);
          setProvinceName(p?.name || "");
          setDistricts([]);
          setDistrictId("");
          setDistrictName("");
        }}
      >
        <option value="">{labels.province}</option>
        {provinceOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className={`${fieldClass} disabled:bg-slate-100`}
        value={districtId}
        disabled={districtDisabled}
        onChange={(e) => {
          const nextId = e.target.value;
          setDistrictId(nextId);
          const d = districtOptions.find((x) => String(x.id) === nextId);
          setDistrictName(d?.name || "");
        }}
      >
        <option value="">{labels.district}</option>
        {districtOptions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        className={fieldClass}
        value={professionId}
        onChange={(e) => setProfessionId(e.target.value)}
      >
        <option value="">{labels.allProf}</option>
        {professions.map((pr) => (
          <option key={pr.id} value={pr.id}>
            {pr.name}
          </option>
        ))}
      </select>
      <p className="text-[10px] leading-tight text-slate-600">{labels.hint}</p>
      <div className="flex gap-2 sm:gap-1.5">
        <button
          className="btn-primary min-h-[44px] flex-1 touch-manipulation !py-3 text-base leading-tight sm:!py-2 sm:text-sm"
          type="submit"
        >
          {labels.search}
        </button>
        <button
          type="button"
          className="min-h-[44px] min-w-[4.5rem] touch-manipulation rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium leading-tight text-orange-900 hover:bg-orange-50 sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 sm:text-xs"
          onClick={() => {
            setProvinceId("");
            setDistrictId("");
            setProvinceName("");
            setDistrictName("");
            setProfessionId("");
            mergeAndPush({ clearEngineer: true });
          }}
        >
          {labels.clear}
        </button>
      </div>
    </form>
  );
}
