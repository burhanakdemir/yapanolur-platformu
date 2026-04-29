"use client";

import { useEffect, useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";

type Option = { id: number; name: string };

/**
 * İlan arama panelindeki gibi /api/locations ile il + ilçe seçimi.
 * FormData için `province` ve `district` gizli alanlarında seçilen isimler tutulur.
 */
export default function ProvinceDistrictSelect({
  disabled,
  initialProvince,
  initialDistrict,
}: {
  disabled?: boolean;
  initialProvince?: string | null;
  initialDistrict?: string | null;
}) {
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinceName, setProvinceName] = useState(initialProvince || "");
  const [districtName, setDistrictName] = useState(initialDistrict || "");

  useEffect(() => {
    fetch(clientApiUrl("/api/locations?level=provinces"), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) && data.length > 0 ? data : TR_PROVINCES_FALLBACK;
        setProvinces(list);
        const selected = list.find((p: Option) => p.name === initialProvince);
        if (selected) setProvinceId(String(selected.id));
      })
      .catch(() => setProvinces(TR_PROVINCES_FALLBACK));
  }, [initialProvince]);

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
        const selected = list.find((d: Option) => d.name === initialDistrict);
        if (selected) setDistrictId(String(selected.id));
      })
      .catch(() => setDistricts([]));
  }, [provinceId, initialDistrict]);

  const districtDisabled = Boolean(disabled) || !provinceId;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">İl</label>
      <select
        className="w-full rounded-lg border bg-white p-2 text-sm disabled:cursor-not-allowed disabled:bg-orange-100"
        value={provinceId}
        disabled={disabled}
        onChange={(e) => {
          const nextId = e.target.value;
          setProvinceId(nextId);
          const p = provinces.find((x) => String(x.id) === nextId);
          setProvinceName(p?.name || "");
          setDistricts([]);
          setDistrictId("");
          setDistrictName("");
        }}
        required={!disabled}
      >
        <option value="">İl seçin</option>
        {provinces.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <label className="block text-sm font-medium text-slate-700">İlçe</label>
      <select
        className="w-full rounded-lg border bg-white p-2 text-sm disabled:cursor-not-allowed disabled:bg-orange-100"
        value={districtId}
        disabled={districtDisabled}
        onChange={(e) => {
          const nextId = e.target.value;
          setDistrictId(nextId);
          const d = districts.find((x) => String(x.id) === nextId);
          setDistrictName(d?.name || "");
        }}
        required={!disabled}
      >
        <option value="">İlçe seçin</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <input type="hidden" name="province" value={provinceName} readOnly />
      <input type="hidden" name="district" value={districtName} readOnly />
    </div>
  );
}
