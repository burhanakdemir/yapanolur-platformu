import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { serializeThread } from "@/lib/supportThreadServer";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id: conversationId } = await ctx.params;
  const conv = await prisma.supportConversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  if (conv.status === "KAPALI") {
    return NextResponse.json({ error: "Sohbet kapatılmış" }, { status: 400 });
  }
  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (text.length < 1) {
    return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Mesaj çok uzun" }, { status: 400 });
  }
  await prisma.supportMessage.create({
    data: {
      conversationId,
      sender: "ADMIN",
      body: text,
      authorAdminId: session.userId,
    },
  });
  const updated = await prisma.supportConversation.update({
    where: { id: conversationId },
    data: {
      status: "ANSWERED",
      lastAdminMessageAt: new Date(),
      lastReadByAdminAt: new Date(),
    },
  });
  const allDesc = await prisma.supportMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ thread: serializeThread(updated, allDesc.reverse()) });
}
