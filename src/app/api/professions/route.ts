import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultProfessionsIfEmpty } from "@/lib/defaultProfessions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Uye kayit formu: aktif meslek listesi. ?search= ile isim filtresi (bos veya yok = tum liste). */
export async function GET(request: Request) {
  try {
    await ensureDefaultProfessionsIfEmpty(prisma);
    const { searchParams } = new URL(request.url);
    const qRaw = (searchParams.get("search") ?? "").trim();
    const list = await prisma.profession.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    if (!qRaw) return NextResponse.json(list);
    const q = qRaw.toLocaleLowerCase("tr-TR");
    const filtered = list.filter((p) =>
      p.name.toLocaleLowerCase("tr-TR").includes(q),
    );
    return NextResponse.json(filtered);
  } catch (e) {
    console.error("[GET /api/professions]", e);
    return NextResponse.json({ error: "Liste alinamadi." }, { status: 500 });
  }
}
