import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ userId: string }> };

/** Yorum formu icin ucret ve bakiye bilgisi */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const feeEnabled = Boolean(settings.memberCommentFeeEnabled);
    const feeAmount = Number(settings.memberCommentFeeAmountTry ?? 0);

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);

    let balance = 0;
    let isSelf = false;
    let canPost = false;
    let needsLogin = true;

    if (session?.role === "MEMBER") {
      needsLogin = false;
      isSelf = session.userId === targetUserId;
      balance = await sumUserCreditTry(session.userId);
      const approved = await prisma.user.findFirst({
        where: { id: session.userId, role: "MEMBER", isMemberApproved: true },
        select: { id: true },
      });
      canPost =
        Boolean(approved) &&
        !isSelf &&
        feeEnabled &&
        feeAmount > 0 &&
        balance >= feeAmount;
    } else if (session && isStaffAdminRole(session.role)) {
      needsLogin = false;
      isSelf = session.userId === targetUserId;
      balance = await sumUserCreditTry(session.userId);
      canPost =
        !isSelf &&
        feeEnabled &&
        feeAmount > 0 &&
        balance >= feeAmount;
    }

    return NextResponse.json({
      feeEnabled,
      feeAmount,
      balance,
      isSelf,
      needsLogin,
      canPost,
    });
  } catch (e) {
    console.error("[GET /api/members/.../comment-info]", e);
    return NextResponse.json({ error: "Sunucu hatasi." }, { status: 500 });
  }
}
