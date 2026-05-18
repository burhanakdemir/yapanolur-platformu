"use client";

import { useEffect, useState } from "react";
import ProvinceSelectField from "@/components/ProvinceSelectField";
import { clientApiUrl } from "@/lib/clientApi";
import { resolveProvinceSelection, type LocationOption } from "@/lib/locationSelect";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";

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
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
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
        const picked = resolveProvinceSelection(list, initialProvince);
        if (picked) {
          setProvinceId(picked.provinceId);
          setProvinceName(picked.provinceName);
        }
      })
      .catch(() => {
        const fallback = TR_PROVINCES_FALLBACK.filter((p) => p.name === "Antalya");
        const list = fallback.length > 0 ? fallback : TR_PROVINCES_FALLBACK.slice(0, 1);
        setProvinces(list);
        const picked = resolveProvinceSelection(list, initialProvince);
        if (picked) {
          setProvinceId(picked.provinceId);
          setProvinceName(picked.provinceName);
        }
      });
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
        const selected = list.find((d: LocationOption) => d.name === initialDistrict);
        if (selected) setDistrictId(String(selected.id));
      })
      .catch(() => setDistricts([]));
  }, [provinceId, initialDistrict]);

  const districtDisabled = Boolean(disabled) || !provinceId;

  return (
    <div className="space-y-1.5">
      <ProvinceSelectField
        provinces={provinces}
        provinceId={provinceId}
        disabled={disabled}
        variant="form"
        onChange={(nextId, nextName) => {
          setProvinceId(nextId);
          setProvinceName(nextName);
          setDistricts([]);
          setDistrictId("");
          setDistrictName("");
        }}
      />
      <label className="block text-xs font-medium text-slate-700">İlçe</label>
      <select
        className="h-9 w-full rounded-lg border bg-white px-2.5 py-0 text-sm leading-tight disabled:cursor-not-allowed disabled:bg-orange-100"
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
