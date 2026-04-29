import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ voteId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { voteId } = await params;
    if (!voteId) {
      return NextResponse.json({ error: "Gecersiz." }, { status: 400 });
    }

    const v = await prisma.memberPeerVote.findUnique({
      where: { id: voteId },
      select: { id: true },
    });
    if (!v) {
      return NextResponse.json({ error: "Oy bulunamadi." }, { status: 404 });
    }

    await prisma.memberPeerVote.delete({ where: { id: voteId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/member-votes/:voteId]", e);
    return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
  }
}
