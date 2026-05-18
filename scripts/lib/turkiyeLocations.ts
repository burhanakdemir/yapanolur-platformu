import { TR_PROVINCES_FALLBACK } from "../../src/lib/trProvincesFallback";

const BASE = "https://api.turkiyeapi.dev/api/v1";
const FETCH_MS = 12_000;

export type LocationOption = { id: number; name: string };

export async function fetchProvincesFromTurkiyeApi(): Promise<LocationOption[]> {
  try {
    const res = await fetch(`${BASE}/provinces`, {
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { id: number; name: string }[] };
    const list = (json?.data || []).map((p) => ({ id: p.id, name: p.name }));
    if (list.length > 0) return list;
  } catch {
    /* yedek */
  }
  return TR_PROVINCES_FALLBACK;
}

export async function fetchDistrictsFromTurkiyeApi(provinceId: string): Promise<LocationOption[]> {
  try {
    const res = await fetch(`${BASE}/districts?provinceId=${encodeURIComponent(provinceId)}`, {
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { id: number; name: string }[] };
    return (json?.data || []).map((d) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}
