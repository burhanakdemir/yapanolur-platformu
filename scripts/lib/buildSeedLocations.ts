import type { PrismaClient } from "../../src/generated/prisma/client";
import {
  filterDistrictOptions,
  getServiceArea,
  locationNamesEqual,
  type ServiceArea,
} from "../../src/lib/serviceArea";
import { fetchDistrictsFromTurkiyeApi, fetchProvincesFromTurkiyeApi } from "./turkiyeLocations";

export type SeedLoc = {
  province: string;
  city: string;
  district: string;
  neighborhood: string;
};

const MAHALLE = [
  "Cumhuriyet",
  "Fatih",
  "Yıldırım",
  "İnönü",
  "Bahçelievler",
  "Kültür",
  "Yenişehir",
  "Barbaros",
  "Zeytinburnu",
  "Yavuz Selim",
];

type LocationSlot = { province: string; city: string; district: string };

/**
 * AdminSettings hizmet bolgesine gore il/ilce listesi (turkiyeapi.dev).
 * targetCount kadar mahalle varyasyonu ile genisletilir.
 */
export async function buildSeedLocationsForServiceArea(
  prisma: Pick<PrismaClient, "adminSettings">,
  targetCount: number,
): Promise<{ locations: SeedLoc[]; area: ServiceArea }> {
  const area = await getServiceArea(prisma);
  if (area.provinces.length === 0) {
    throw new Error("Hizmet bolgesinde il tanimli degil. Admin > Site ayarlari.");
  }

  const allProvinces = await fetchProvincesFromTurkiyeApi();
  const slots: LocationSlot[] = [];

  for (const configuredProvince of area.provinces) {
    const row = allProvinces.find((p) => locationNamesEqual(p.name, configuredProvince));
    if (!row) {
      console.warn(`[seed] Il API listesinde bulunamadi, atlaniyor: ${configuredProvince}`);
      continue;
    }

    const districts = await fetchDistrictsFromTurkiyeApi(String(row.id));
    const filtered = filterDistrictOptions(area, row.name, districts);
    const districtNames =
      filtered.length > 0 ? filtered.map((d) => d.name) : districts.map((d) => d.name);

    if (districtNames.length === 0) {
      throw new Error(
        `${row.name} icin ilce listesi alinamadi. Ag erisimi veya hizmet bolgesi ilce kisitini kontrol edin.`,
      );
    }

    for (const district of districtNames) {
      slots.push({
        province: row.name,
        city: row.name,
        district,
      });
    }
  }

  if (slots.length === 0) {
    throw new Error(
      "Hizmet bolgesine uygun konum uretilemedi. Illerin API adlari ile site ayarindaki adlar eslesiyor mu?",
    );
  }

  const locations: SeedLoc[] = [];
  for (let i = 0; i < targetCount; i++) {
    const s = slots[i % slots.length]!;
    locations.push({
      ...s,
      neighborhood: `${MAHALLE[i % MAHALLE.length]} Mah.`,
    });
  }

  return { locations, area };
}
