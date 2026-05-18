"use client";

import { useEffect, useMemo, useState } from "react";
import ProvinceSelectField from "@/components/ProvinceSelectField";
import { clientApiUrl } from "@/lib/clientApi";
import { resolveProvinceSelection, type LocationOption } from "@/lib/locationSelect";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";

type CategoryOption = {
  id: string;
  name: string;
  depth: number;
};

export default function SearchFilters({
  lang,
  categories,
  initial,
}: {
  lang: "tr" | "en";
  categories: CategoryOption[];
  initial: {
    categoryId?: string;
    province?: string;
    district?: string;
    neighborhood?: string;
  };
}) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinceName, setProvinceName] = useState(initial.province || "");
  const [districtName, setDistrictName] = useState(initial.district || "");
  const [neighborhoodName, setNeighborhoodName] = useState(initial.neighborhood || "");

  useEffect(() => {
    fetch(clientApiUrl("/api/locations?level=provinces"), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) && data.length > 0 ? data : TR_PROVINCES_FALLBACK;
        setProvinces(list);
        const picked = resolveProvinceSelection(list, initial.province);
        if (picked) {
          setProvinceId(picked.provinceId);
          setProvinceName(picked.provinceName);
        }
      })
      .catch(() => {
        setProvinces(TR_PROVINCES_FALLBACK);
      });
  }, [initial.province]);

  useEffect(() => {
    if (!provinceId) {
      return;
    }
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
        const selected = list.find((d) => d.name === initial.district);
        if (selected) setDistrictId(String(selected.id));
      })
      .catch(() => setDistricts([]));
  }, [provinceId, initial.district]);

  useEffect(() => {
    if (!districtId) {
      return;
    }
    fetch(clientApiUrl(`/api/locations?level=neighborhoods&districtId=${districtId}`), {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => setNeighborhoods(Array.isArray(data) ? data : []))
      .catch(() => setNeighborhoods([]));
  }, [districtId]);

  const districtDisabled = !provinceId;
  const neighborhoodDisabled = !districtId;

  const provinceOptions = useMemo(() => provinces, [provinces]);
  const districtOptions = useMemo(() => districts, [districts]);
  const neighborhoodOptions = useMemo(() => neighborhoods, [neighborhoods]);
  const categoryOptions = useMemo(() => categories, [categories]);

  const fieldClass =
    "w-full touch-manipulation rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base leading-tight min-h-[44px] sm:min-h-0 sm:px-2 sm:py-1.5 sm:text-sm";

  return (
    <form className="space-y-2 sm:space-y-1.5" method="get" action="/">
      <input type="hidden" name="lang" value={lang} />
      <ProvinceSelectField
        provinces={provinceOptions}
        provinceId={provinceId}
        required={false}
        placeholder={lang === "tr" ? "İl seçin" : "Select province"}
        selectClassName={fieldClass}
        onChange={(nextId, nextName) => {
          setProvinceId(nextId);
          setProvinceName(nextName);
          setDistricts([]);
          setNeighborhoods([]);
          setDistrictId("");
          setDistrictName("");
          setNeighborhoodName("");
        }}
      />
      <select
        className={`${fieldClass} disabled:bg-slate-100`}
        value={districtId}
        disabled={districtDisabled}
        onChange={(e) => {
          const nextId = e.target.value;
          setDistrictId(nextId);
          const d = districts.find((x) => String(x.id) === nextId);
          setDistrictName(d?.name || "");
          setNeighborhoodName("");
        }}
      >
        <option value="">{lang === "tr" ? "Ilce secin" : "Select district"}</option>
        {districtOptions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        className={`${fieldClass} disabled:bg-slate-100`}
        value={neighborhoodName}
        disabled={neighborhoodDisabled}
        onChange={(e) => setNeighborhoodName(e.target.value)}
      >
        <option value="">{lang === "tr" ? "Mahalle secin" : "Select neighborhood"}</option>
        {neighborhoodOptions.map((n) => (
          <option key={n.id} value={n.name}>
            {n.name}
          </option>
        ))}
      </select>
      <select
        className={fieldClass}
        name="categoryId"
        defaultValue={initial.categoryId || ""}
      >
        <option value="">{lang === "tr" ? "Proje Turu (Tum)" : "Project Type (All)"}</option>
        {categoryOptions.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {"- ".repeat(cat.depth)}
            {cat.name}
          </option>
        ))}
      </select>
      <input type="hidden" name="province" value={provinceName} />
      <input type="hidden" name="district" value={districtName} />
      <input type="hidden" name="neighborhood" value={neighborhoodName} />
      <button
        className="btn-primary min-h-[44px] w-full touch-manipulation !py-3 text-base leading-tight sm:!py-2 sm:text-sm"
        type="submit"
      >
        {lang === "tr" ? "Ara" : "Search"}
      </button>
    </form>
  );
}
