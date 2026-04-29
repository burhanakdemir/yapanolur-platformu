import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { viewerProfileFlags, whereMemberProfileVisible } from "@/lib/memberProfileView";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ userId: string }> };

/** Herkese acik: onayli uye profiline gelen yorumlar */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    const { viewerOwnsProfile, viewerIsAdmin } = viewerProfileFlags(
      session ? { userId: session.userId, role: session.role } : null,
      targetUserId,
    );

    const ok = await prisma.user.findFirst({
      where: whereMemberProfileVisible(targetUserId, { viewerOwnsProfile, viewerIsAdmin }),
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    const comments = await prisma.memberComment.findMany({
      where: { toUserId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        body: true,
        createdAt: true,
        replyBody: true,
        repliedAt: true,
        fromUser: {
          select: { id: true, memberNumber: true, name: true },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (e) {
    console.error("[GET /api/members/.../comments]", e);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
