import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { isAnySupportStaffOnline } from "@/lib/supportNotify";
import { supportConversationProvinceWhere } from "@/lib/adminProvinceScope";

export async function GET(req: Request) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const takeRaw = Number.parseInt(searchParams.get("take") ?? "80", 10);
  const take = Math.min(150, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 80));
  const online = await isAnySupportStaffOnline();
  const provinceWhere = await supportConversationProvinceWhere(session);
  const rows = await prisma.supportConversation.findMany({
    where: provinceWhere,
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      user: { select: { email: true, name: true, memberNumber: true } },
    },
  });
  const result = await Promise.all(
    rows.map(async (conv) => {
      const unread = await prisma.supportMessage.count({
        where: {
          conversationId: conv.id,
          sender: "VISITOR",
          createdAt: { gt: conv.lastReadByAdminAt },
        },
      });
      const last = await prisma.supportMessage.findFirst({
        where: { conversationId: conv.id },
        orderBy: { createdAt: "desc" },
        select: { body: true, createdAt: true, sender: true },
      });
      return {
        id: conv.id,
        status: conv.status,
        guestEmail: conv.guestEmail,
        province: conv.province,
        user: conv.user
          ? {
              email: conv.user.email,
              name: conv.user.name,
              memberNumber: conv.user.memberNumber,
            }
          : null,
        updatedAt: conv.updatedAt.toISOString(),
        unreadForAdmin: unread,
        lastMessagePreview: last
          ? { body: last.body.slice(0, 120), at: last.createdAt.toISOString(), sender: last.sender }
          : null,
      };
    }),
  );
  return NextResponse.json({ conversations: result, anyStaffOnline: online });
}
