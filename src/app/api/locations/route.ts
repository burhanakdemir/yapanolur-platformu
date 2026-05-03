import { NextResponse } from "next/server";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";

const BASE = "https://api.turkiyeapi.dev/api/v1";

const FETCH_MS = 12_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const level = url.searchParams.get("level");

  try {
    if (level === "provinces") {
      try {
        const res = await fetch(`${BASE}/provinces`, {
          next: { revalidate: 60 * 60 * 24 },
          signal: AbortSignal.timeout(FETCH_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: { id: number; name: string }[] };
        const list = (json?.data || []).map((p) => ({ id: p.id, name: p.name }));
        if (list.length > 0) {
          return NextResponse.json(list);
        }
      } catch {
        /* harici API yok / zaman aşımı → yerel yedek */
      }
      return NextResponse.json(TR_PROVINCES_FALLBACK);
    }

    if (level === "districts") {
      const provinceId = url.searchParams.get("provinceId");
      if (!provinceId) {
        return NextResponse.json({ error: "provinceId gerekli." }, { status: 400 });
      }
      try {
        const res = await fetch(`${BASE}/districts?provinceId=${encodeURIComponent(provinceId)}`, {
          cache: "force-cache",
          next: { revalidate: 60 * 60 * 24 * 7 },
          signal: AbortSignal.timeout(FETCH_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: { id: number; name: string }[] };
        return NextResponse.json(
          (json?.data || []).map((d) => ({ id: d.id, name: d.name })),
        );
      } catch {
        return NextResponse.json([]);
      }
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
