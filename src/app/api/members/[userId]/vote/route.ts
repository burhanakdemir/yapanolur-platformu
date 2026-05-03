import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole, staffViewerRoleLabel } from "@/lib/adminRoles";
import { buildMemberRatingPayload } from "@/lib/memberRatingPayload";
import { notifyProfileOwnerPeerVote } from "@/lib/memberProfileNotificationEmail";
import { shouldSendPeerVoteEmail } from "@/lib/memberProfileVoteNotifyPolicy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["like", "dislike", "clear"]),
});

type Params = { params: Promise<{ userId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || (!isStaffAdminRole(session.role) && session.role !== "MEMBER")) {
      return NextResponse.json({ error: "Uye girisi gerekli." }, { status: 401 });
    }

    if (session.userId === targetUserId) {
      return NextResponse.json({ error: "Kendi profilinize oy veremezsiniz." }, { status: 400 });
    }

    let voterId: string | null = null;
    if (isStaffAdminRole(session.role)) {
      const u = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true },
      });
      voterId = u?.id ?? null;
    } else {
      const voter = await prisma.user.findFirst({
        where: { id: session.userId, role: "MEMBER", isMemberApproved: true },
        select: { id: true },
      });
      voterId = voter?.id ?? null;
    }
    if (!voterId) {
      return NextResponse.json({ error: "Onayli uye hesabi gerekli." }, { status: 403 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, role: "MEMBER", isMemberApproved: true },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Hedef uye bulunamadi." }, { status: 404 });
    }

    const { action } = bodySchema.parse(await req.json());

    const existingVote = await prisma.memberPeerVote.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: voterId, toUserId: targetUserId },
      },
      select: { type: true },
    });

    if (action === "clear") {
      await prisma.memberPeerVote.deleteMany({
        where: { fromUserId: voterId, toUserId: targetUserId },
      });
    } else if (action === "like") {
      await prisma.memberPeerVote.upsert({
        where: {
          fromUserId_toUserId: { fromUserId: voterId, toUserId: targetUserId },
        },
        create: { fromUserId: voterId, toUserId: targetUserId, type: "LIKE" },
        update: { type: "LIKE" },
      });
    } else {
      await prisma.memberPeerVote.upsert({
        where: {
          fromUserId_toUserId: { fromUserId: voterId, toUserId: targetUserId },
        },
        create: { fromUserId: voterId, toUserId: targetUserId, type: "DISLIKE" },
        update: { type: "DISLIKE" },
      });
    }

    if (action !== "clear" && shouldSendPeerVoteEmail(action, existingVote)) {
      void notifyProfileOwnerPeerVote({
        targetUserId,
        voteType: action === "like" ? "LIKE" : "DISLIKE",
        voterUserId: voterId,
      });
    }

    const rating = await buildMemberRatingPayload(prisma, targetUserId, session.userId, {
      viewerRole: staffViewerRoleLabel(session.role),
    });
    if (!rating) {
      return NextResponse.json({ error: "Okunamadi." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rating });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
    }
    console.error("[POST /api/members/.../vote]", error);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
