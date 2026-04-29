import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(800),
});

type Params = { params: Promise<{ commentId: string }> };

/** Profil sahibi gelen yoruma ucretli tek cevap */
export async function POST(req: Request, { params }: Params) {
  try {
    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json({ error: "Gecersiz yorum." }, { status: 400 });
    }

    const { body: text } = bodySchema.parse(await req.json());

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || (!isStaffAdminRole(session.role) && session.role !== "MEMBER")) {
      return NextResponse.json({ error: "Uye girisi gerekli." }, { status: 401 });
    }

    const comment = await prisma.memberComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        toUserId: true,
        replyBody: true,
        fromUserId: true,
      },
    });
    if (!comment) {
      return NextResponse.json({ error: "Yorum bulunamadi." }, { status: 404 });
    }
    if (comment.toUserId !== session.userId) {
      return NextResponse.json({ error: "Bu yoruma sadece profil sahibi cevap verebilir." }, { status: 403 });
    }
    if (comment.replyBody) {
      return NextResponse.json({ error: "Bu yoruma zaten cevap verildi." }, { status: 400 });
    }

    if (session.role === "MEMBER") {
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
      return NextResponse.json({ error: "Yorum cevabi ucreti su an kapali." }, { status: 400 });
    }

    const fee = settings.memberCommentFeeAmountTry ?? 0;
    const balance = await sumUserCreditTry(session.userId);
    if (balance < fee) {
      return NextResponse.json(
        { error: `Yetersiz bakiye. Gerekli: ${fee} TL, mevcut: ${balance} TL` },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.memberComment.update({
        where: { id: commentId },
        data: {
          replyBody: text,
          repliedAt: new Date(),
        },
        select: {
          id: true,
          replyBody: true,
          repliedAt: true,
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId: session.userId,
          type: "MEMBER_COMMENT_REPLY_FEE",
          amountTry: -fee,
          description: `Profil yorumuna cevap (${commentId})`,
          referenceId: commentId,
        },
      });
      return u;
    });

    return NextResponse.json({ ok: true, reply: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz metin." }, { status: 400 });
    }
    console.error("[POST .../comments/.../reply]", error);
    return NextResponse.json({ error: "Cevap kaydedilemedi." }, { status: 500 });
  }
}
