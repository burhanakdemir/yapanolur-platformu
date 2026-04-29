import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { serializeThread } from "@/lib/supportThreadServer";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const conv = await prisma.supportConversation.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, memberNumber: true } } },
  });
  if (!conv) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const messagesDesc = await prisma.supportMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  await prisma.supportConversation.update({
    where: { id },
    data: { lastReadByAdminAt: new Date() },
  });
  return NextResponse.json({
    thread: serializeThread(conv, messagesDesc.reverse()),
    user: conv.user
      ? {
          email: conv.user.email,
          name: conv.user.name,
          memberNumber: conv.user.memberNumber,
        }
      : null,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  if (body.status === "KAPALI") {
    const conv = await prisma.supportConversation.update({
      where: { id },
      data: { status: "KAPALI" },
    });
    return NextResponse.json({ ok: true, status: conv.status });
  }
  return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
}
