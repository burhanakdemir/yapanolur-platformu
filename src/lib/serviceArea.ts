import type { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

export const DEFAULT_SERVICE_AREA_PROVINCES_JSON = '["Antalya"]';
export const DEFAULT_SERVICE_AREA_DISTRICTS_JSON = "{}";

export type ServiceArea = {
  provinces: string[];
  /** İl adı → izinli ilçe adları; boş dizi veya anahtar yok → o ilde tüm ilçeler. */
  districtsByProvince: Record<string, string[]>;
};

export function normalizeLocationName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function locationNamesEqual(a: string, b: string): boolean {
  return (
    normalizeLocationName(a).toLocaleLowerCase("tr") ===
    normalizeLocationName(b).toLocaleLowerCase("tr")
  );
}

function findCanonicalProvince(area: ServiceArea, province: string): string | null {
  const n = normalizeLocationName(province);
  if (!n) return null;
  return area.provinces.find((p) => locationNamesEqual(p, n)) ?? null;
}

export function parseServiceAreaProvincesJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return JSON.parse(DEFAULT_SERVICE_AREA_PROVINCES_JSON) as string[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["Antalya"];
    return [...new Set(parsed.map((x) => normalizeLocationName(String(x))).filter(Boolean))];
  } catch {
    return ["Antalya"];
  }
}

export function parseServiceAreaDistrictsJson(raw: string | null | undefined): Record<string, string[]> {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      const prov = normalizeLocationName(key);
      if (!prov) continue;
      if (!Array.isArray(val)) continue;
      const districts = [...new Set(val.map((d) => normalizeLocationName(String(d))).filter(Boolean))];
      out[prov] = districts;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseServiceAreaFromSettings(row: {
  serviceAreaProvincesJson?: string | null;
  serviceAreaDistrictsJson?: string | null;
}): ServiceArea {
  return {
    provinces: parseServiceAreaProvincesJson(row.serviceAreaProvincesJson),
    districtsByProvince: parseServiceAreaDistrictsJson(row.serviceAreaDistrictsJson),
  };
}

export async function getServiceArea(
  prisma: Pick<PrismaClient, "adminSettings">,
): Promise<ServiceArea> {
  const row = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: {
      serviceAreaProvincesJson: true,
      serviceAreaDistrictsJson: true,
    },
  });
  return parseServiceAreaFromSettings(row ?? {});
}

export function getDefaultProvince(area: ServiceArea): string | null {
  return area.provinces.length === 1 ? area.provinces[0]! : null;
}

export function isProvinceAllowed(area: ServiceArea, province: string): boolean {
  return findCanonicalProvince(area, province) !== null;
}

export function isDistrictAllowed(area: ServiceArea, province: string, district: string): boolean {
  const canonProv = findCanonicalProvince(area, province);
  if (!canonProv) return false;
  const dist = normalizeLocationName(district);
  if (!dist) return false;
  const allowed = area.districtsByProvince[canonProv];
  if (!allowed || allowed.length === 0) {
    const alt = Object.entries(area.districtsByProvince).find(([k]) => locationNamesEqual(k, canonProv));
    const list = alt?.[1];
    if (!list || list.length === 0) return true;
    return list.some((d) => locationNamesEqual(d, dist));
  }
  return allowed.some((d) => locationNamesEqual(d, dist));
}

export function validateServiceAreaLocation(
  area: ServiceArea,
  province: string,
  district: string,
): { ok: true; province: string; district: string } | { ok: false; message: string } {
  const canonProv = findCanonicalProvince(area, province);
  if (!canonProv) {
    return {
      ok: false,
      message: "Seçilen il hizmet bölgesi dışında. Yalnızca izin verilen illerde kayıt yapılabilir.",
    };
  }
  const dist = normalizeLocationName(district);
  if (!dist) {
    return { ok: false, message: "İlçe seçimi zorunludur." };
  }
  if (!isDistrictAllowed(area, canonProv, dist)) {
    return {
      ok: false,
      message: "Seçilen ilçe hizmet bölgesi dışında.",
    };
  }
  return { ok: true, province: canonProv, district: dist };
}

export function filterLocationOptions<T extends { name: string }>(
  area: ServiceArea,
  list: T[],
): T[] {
  return list.filter((item) => isProvinceAllowed(area, item.name));
}

export function filterDistrictOptions<T extends { name: string }>(
  area: ServiceArea,
  provinceName: string,
  list: T[],
): T[] {
  const canonProv = findCanonicalProvince(area, provinceName);
  if (!canonProv) return [];
  const allowed = area.districtsByProvince[canonProv];
  const altKey = Object.keys(area.districtsByProvince).find((k) => locationNamesEqual(k, canonProv));
  const allowedList = allowed ?? (altKey ? area.districtsByProvince[altKey] : undefined);
  if (!allowedList || allowedList.length === 0) return list;
  return list.filter((d) => allowedList.some((a) => locationNamesEqual(a, d.name)));
}

/** İlan listesi: hizmet bölgesi dışı kayıtlar gösterilmez. */
export function buildAdServiceAreaFilter(
  area: ServiceArea,
  opts?: { province?: string; district?: string },
): Prisma.AdWhereInput {
  const provParam = opts?.province?.trim();
  const distParam = opts?.district?.trim();

  if (provParam) {
    const canonProv = findCanonicalProvince(area, provParam);
    if (!canonProv) {
      return { id: { in: [] } };
    }
    if (distParam) {
      if (!isDistrictAllowed(area, canonProv, distParam)) {
        return { id: { in: [] } };
      }
      return { province: canonProv, district: normalizeLocationName(distParam) };
    }
    return { province: canonProv };
  }

  if (area.provinces.length === 0) {
    return { id: { in: [] } };
  }
  if (area.provinces.length === 1) {
    return { province: area.provinces[0] };
  }
  return { province: { in: area.provinces } };
}

export function serializeServiceAreaForClient(area: ServiceArea) {
  return {
    provinces: area.provinces,
    districtsByProvince: area.districtsByProvince,
  };
}
