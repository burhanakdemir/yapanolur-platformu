import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const takeRaw = Number.parseInt(searchParams.get("take") ?? "200", 10);
    const take = Math.min(500, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 200));

    const where: Prisma.MemberCommentWhereInput | undefined =
      q.length > 0
        ? {
            OR: [
              { body: { contains: q } },
              { fromUser: { OR: [{ email: { contains: q } }, { name: { contains: q } }] } },
              { toUser: { OR: [{ email: { contains: q } }, { name: { contains: q } }] } },
            ],
          }
        : undefined;

    const comments = await prisma.memberComment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        fromUser: { select: { id: true, memberNumber: true, name: true, email: true } },
        toUser: { select: { id: true, memberNumber: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ comments });
  } catch (e) {
    console.error("[GET /api/admin/member-comments]", e);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
