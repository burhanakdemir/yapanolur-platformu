"use client";

import { useCallback, useEffect, useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";

type Option = { id: number; name: string };

type ServiceAreaState = {
  provinces: string[];
  districtsByProvince: Record<string, string[]>;
};

export default function ServiceAreaSettingsSection({
  onMessage,
}: {
  onMessage: (msg: string, ok: boolean) => void;
}) {
  const [allProvinces, setAllProvinces] = useState<Option[]>([]);
  const [area, setArea] = useState<ServiceAreaState>({ provinces: ["Antalya"], districtsByProvince: {} });
  const [activeProvince, setActiveProvince] = useState<string>("Antalya");
  const [districtOptions, setDistrictOptions] = useState<Option[]>([]);
  const [allDistrictsMode, setAllDistrictsMode] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const sa = data.serviceArea as ServiceAreaState | undefined;
        if (sa?.provinces?.length) {
          setArea({
            provinces: sa.provinces,
            districtsByProvince: sa.districtsByProvince ?? {},
          });
          setActiveProvince(sa.provinces[0] ?? "Antalya");
          const modes: Record<string, boolean> = {};
          for (const p of sa.provinces) {
            const list = sa.districtsByProvince?.[p];
            modes[p] = !list || list.length === 0;
          }
          setAllDistrictsMode(modes);
        }
      })
      .catch(() => onMessage("Hizmet bölgesi ayarları yüklenemedi.", false));
  }, [onMessage]);

  useEffect(() => {
    loadSettings();
    fetch(clientApiUrl("/api/locations?level=provinces&config=1"), { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllProvinces(data);
      })
      .catch(() => onMessage("İl listesi alınamadı.", false));
  }, [loadSettings, onMessage]);

  useEffect(() => {
    if (!activeProvince) {
      queueMicrotask(() => setDistrictOptions([]));
      return;
    }
    const row = allProvinces.find((p) => p.name === activeProvince);
    if (!row) {
      queueMicrotask(() => setDistrictOptions([]));
      return;
    }
    fetch(clientApiUrl(`/api/locations?level=districts&provinceId=${row.id}&config=1`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        setDistrictOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => setDistrictOptions([]));
  }, [activeProvince, allProvinces]);

  function toggleProvince(name: string, checked: boolean) {
    setArea((prev) => {
      const next = checked
        ? [...new Set([...prev.provinces, name])]
        : prev.provinces.filter((p) => p !== name);
      if (!checked) {
        const districtsByProvince = { ...prev.districtsByProvince };
        delete districtsByProvince[name];
        return { provinces: next, districtsByProvince };
      }
      return { ...prev, provinces: next };
    });
    if (checked) {
      setAllDistrictsMode((m) => ({ ...m, [name]: true }));
      setActiveProvince(name);
    }
  }

  function toggleDistrict(name: string, checked: boolean) {
    if (!activeProvince) return;
    setAllDistrictsMode((m) => ({ ...m, [activeProvince]: false }));
    setArea((prev) => {
      const current = prev.districtsByProvince[activeProvince] ?? [];
      const nextList = checked
        ? [...new Set([...current, name])]
        : current.filter((d) => d !== name);
      return {
        ...prev,
        districtsByProvince: {
          ...prev.districtsByProvince,
          [activeProvince]: nextList,
        },
      };
    });
  }

  function setAllDistrictsForActive(checked: boolean) {
    if (!activeProvince) return;
    setAllDistrictsMode((m) => ({ ...m, [activeProvince]: checked }));
    setArea((prev) => {
      const next = { ...prev.districtsByProvince };
      if (checked) {
        delete next[activeProvince];
      } else {
        next[activeProvince] = [];
      }
      return { ...prev, districtsByProvince: next };
    });
  }

  async function saveServiceArea() {
    if (area.provinces.length === 0) {
      onMessage("En az bir il seçin.", false);
      return;
    }
    setSaving(true);
    const districtsPayload: Record<string, string[]> = {};
    for (const p of area.provinces) {
      if (allDistrictsMode[p]) continue;
      const list = area.districtsByProvince[p];
      if (list && list.length > 0) {
        districtsPayload[p] = list;
      }
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        serviceAreaProvincesJson: JSON.stringify(area.provinces),
        serviceAreaDistrictsJson: JSON.stringify(districtsPayload),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      onMessage(typeof data.error === "string" ? data.error : "Kayıt başarısız.", false);
      return;
    }
    onMessage("Hizmet bölgesi kaydedildi.", true);
    loadSettings();
  }

  const activeDistricts = area.districtsByProvince[activeProvince] ?? [];
  const allDistricts = Boolean(allDistrictsMode[activeProvince]);

  return (
    <section className="glass-card space-y-4 rounded-2xl p-5">
      <div>
        <h2 className="text-lg font-semibold text-orange-950">Hizmet bölgesi (İl / İlçe)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Kayıt, ilan verme ve aramalarda yalnızca seçilen il ve ilçeler kullanılabilir. Varsayılan:
          Antalya.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">İller</p>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          <ul className="grid gap-1 sm:grid-cols-2">
            {allProvinces.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-orange-50">
                  <input
                    type="checkbox"
                    checked={area.provinces.includes(p.name)}
                    onChange={(e) => toggleProvince(p.name, e.target.checked)}
                  />
                  {p.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {area.provinces.length > 0 ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">İlçe kısıtı (il seçin)</label>
          <select
            className="w-full rounded-lg border bg-white p-2 text-sm"
            value={activeProvince}
            onChange={(e) => setActiveProvince(e.target.value)}
          >
            {area.provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDistricts}
              onChange={(e) => setAllDistrictsForActive(e.target.checked)}
            />
            Tüm ilçeler (bu ilde kısıt yok)
          </label>
          {!allDistricts ? (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              <ul className="grid gap-1 sm:grid-cols-2">
                {districtOptions.map((d) => (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-orange-50">
                      <input
                        type="checkbox"
                        checked={activeDistricts.includes(d.name)}
                        onChange={(e) => toggleDistrict(d.name, e.target.checked)}
                      />
                      {d.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveServiceArea()}>
        {saving ? "Kaydediliyor…" : "Hizmet bölgesini kaydet"}
      </button>
    </section>
  );
}
