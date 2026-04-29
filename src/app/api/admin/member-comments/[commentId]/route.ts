import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ commentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json({ error: "Gecersiz." }, { status: 400 });
    }

    const c = await prisma.memberComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Yorum bulunamadi." }, { status: 404 });
    }

    await prisma.memberComment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/member-comments/:id]", e);
    return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
  }
}
