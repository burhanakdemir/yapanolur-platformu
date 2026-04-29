import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export async function GET(req: Request) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const takeRaw = Number.parseInt(searchParams.get("take") ?? "80", 10);
  const take = Math.min(200, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 80));

  const ads = await prisma.ad.findMany({
    where: { status: "PENDING" },
    include: { owner: true, photos: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json(ads);
}
