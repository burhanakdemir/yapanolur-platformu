import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";
import { notifyProfileOwnerNewComment } from "@/lib/memberProfileNotificationEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(800),
});

type Params = { params: Promise<{ userId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const { body: text } = bodySchema.parse(await req.json());

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || (!isStaffAdminRole(session.role) && session.role !== "MEMBER")) {
      return NextResponse.json({ error: "Uye girisi gerekli." }, { status: 401 });
    }

    if (session.userId === targetUserId) {
      return NextResponse.json({ error: "Kendi profilinize yorum yazamazsiniz." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, role: "MEMBER", isMemberApproved: true },
      select: { id: true, memberProfile: { select: { id: true } } },
    });
    if (!target?.memberProfile) {
      return NextResponse.json({ error: "Hedef uye bulunamadi." }, { status: 404 });
    }

    if (isStaffAdminRole(session.role)) {
      const payer = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true },
      });
      if (!payer) {
        return NextResponse.json({ error: "Hesap bulunamadi." }, { status: 404 });
      }
    } else {
      const payer = await prisma.user.findFirst({
        where: { id: session.userId, role: "MEMBER", isMemberApproved: true },
        select: { id: true },
      });
      if (!payer) {
        return NextResponse.json({ error: "Onayli uye hesabi gerekli." }, { status: 403 });
      }
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    if (!settings.memberCommentFeeEnabled || (settings.memberCommentFeeAmountTry ?? 0) <= 0) {
      return NextResponse.json({ error: "Yorum ucreti su an kapali." }, { status: 400 });
    }

    const fee = settings.memberCommentFeeAmountTry ?? 0;
    const balance = await sumUserCreditTry(session.userId);
    if (balance < fee) {
      return NextResponse.json(
        { error: `Yetersiz bakiye. Gerekli: ${fee} TL, mevcut: ${balance} TL` },
        { status: 400 },
      );
    }

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.memberComment.create({
        data: {
          fromUserId: session.userId,
          toUserId: targetUserId,
          body: text,
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          fromUser: { select: { id: true, memberNumber: true, name: true } },
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId: session.userId,
          type: "MEMBER_COMMENT_FEE",
          amountTry: -fee,
          description: `Profil yorumu (${targetUserId})`,
          referenceId: c.id,
        },
      });
      return c;
    });

    void notifyProfileOwnerNewComment({
      targetUserId,
      commentBody: comment.body,
      commentCreatedAt: comment.createdAt,
      fromUserId: session.userId,
      fromMemberNumber: comment.fromUser.memberNumber,
      fromName: comment.fromUser.name,
    });

    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz yorum." }, { status: 400 });
    }
    console.error("[POST /api/members/.../comment]", error);
    return NextResponse.json({ error: "Yorum kaydedilemedi." }, { status: 500 });
  }
}
