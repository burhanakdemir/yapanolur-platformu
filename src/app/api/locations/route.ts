import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import {
  filterDistrictOptions,
  filterLocationOptions,
  getServiceArea,
  isProvinceAllowed,
} from "@/lib/serviceArea";

const BASE = "https://api.turkiyeapi.dev/api/v1";

const FETCH_MS = 12_000;

type LocationOption = { id: number; name: string };

async function fetchProvincesFromSource(): Promise<LocationOption[]> {
  try {
    const res = await fetch(`${BASE}/provinces`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { id: number; name: string }[] };
    const list = (json?.data || []).map((p) => ({ id: p.id, name: p.name }));
    if (list.length > 0) return list;
  } catch {
    /* harici API yok / zaman aşımı → yerel yedek */
  }
  return TR_PROVINCES_FALLBACK;
}

async function fetchDistrictsFromSource(provinceId: string): Promise<LocationOption[]> {
  try {
    const res = await fetch(`${BASE}/districts?provinceId=${encodeURIComponent(provinceId)}`, {
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { id: number; name: string }[] };
    return (json?.data || []).map((d) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

async function isServiceAreaConfigMode(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  if (url.searchParams.get("config") !== "1") return false;
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  return isSuperAdminRole(session?.role);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const configMode = await isServiceAreaConfigMode(req);

  try {
    if (level === "provinces") {
      const list = await fetchProvincesFromSource();
      if (configMode) {
        return NextResponse.json(list);
      }
      const area = await getServiceArea(prisma);
      return NextResponse.json(filterLocationOptions(area, list));
    }

    if (level === "districts") {
      const provinceId = url.searchParams.get("provinceId");
      if (!provinceId) {
        return NextResponse.json({ error: "provinceId gerekli." }, { status: 400 });
      }

      const allProvinces = await fetchProvincesFromSource();
      const provinceRow = allProvinces.find((p) => String(p.id) === provinceId);
      if (!provinceRow) {
        return NextResponse.json({ error: "Il bulunamadi." }, { status: 400 });
      }

      if (!configMode) {
        const area = await getServiceArea(prisma);
        if (!isProvinceAllowed(area, provinceRow.name)) {
          return NextResponse.json(
            { error: "Bu il hizmet bölgesi dışında." },
            { status: 400 },
          );
        }
      }

      const districts = await fetchDistrictsFromSource(provinceId);
      if (configMode) {
        return NextResponse.json(districts);
      }
      const area = await getServiceArea(prisma);
      return NextResponse.json(filterDistrictOptions(area, provinceRow.name, districts));
    }

    if (level === "neighborhoods") {
      const districtId = url.searchParams.get("districtId");
      if (!districtId) {
        return NextResponse.json({ error: "districtId gerekli." }, { status: 400 });
      }
      try {
        const res = await fetch(
          `${BASE}/neighborhoods?districtId=${encodeURIComponent(districtId)}`,
          {
            cache: "force-cache",
            next: { revalidate: 60 * 60 * 24 * 7 },
            signal: AbortSignal.timeout(FETCH_MS),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: { id: number; name: string }[] };
        return NextResponse.json(
          (json?.data || []).map((n) => ({ id: n.id, name: n.name })),
        );
      } catch {
        return NextResponse.json([]);
      }
    }

    return NextResponse.json({ error: "Gecersiz level." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Konum verileri alinamadi." }, { status: 500 });
  }
}
