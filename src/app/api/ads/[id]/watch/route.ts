import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ watched: false, authenticated: false });
  }
  const watch = await prisma.adWatch.findUnique({
    where: { userId_adId: { userId: session.userId, adId: id } },
    select: { id: true },
  });
  return NextResponse.json({ watched: Boolean(watch), authenticated: true });
}

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  const ad = await prisma.ad.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!ad || ad.status !== "APPROVED") {
    return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
  }

  const existing = await prisma.adWatch.findUnique({
    where: { userId_adId: { userId: session.userId, adId: id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.adWatch.delete({
      where: { userId_adId: { userId: session.userId, adId: id } },
    });
    return NextResponse.json({ ok: true, watched: false });
  }

  await prisma.adWatch.create({
    data: { userId: session.userId, adId: id },
  });
  return NextResponse.json({ ok: true, watched: true });
}
