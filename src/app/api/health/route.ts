import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Sağlık kontrolü: `GET /api/health` — hafif.
 * `GET /api/health?deep=1` — PostgreSQL `SELECT 1` (yük dengeleyici / izleme).
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) {
    return NextResponse.json({ ok: true, service: "ilan" });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "ilan", database: "up" });
  } catch {
    return NextResponse.json(
      { ok: false, service: "ilan", database: "down" },
      { status: 503 },
    );
  }
}
