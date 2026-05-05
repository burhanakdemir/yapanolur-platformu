import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { hashPassword } from "@/lib/passwordHash";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole, isSuperAdminRole } from "@/lib/adminRoles";
import { grantWelcomeBonusIfEligible } from "@/lib/welcomeBonus";

const bodySchema = z.object({
  action: z.enum(["approve", "pending", "resetPassword"]),
});

type Params = {
  params: Promise<{ id: string }>;
};

/** Liste yanıtında belge satırları yok; panel satırı açılınca bu uç nokta ile yüklenir. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    const { id } = await params;
    const row = await prisma.memberProfile.findUnique({
      where: { userId: id },
      select: {
        documents: {
          select: { id: true, type: true, fileUrl: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return NextResponse.json({ documents: row?.documents ?? [] });
  } catch (e) {
    console.error("[GET /api/admin/members/:id]", e);
    return NextResponse.json({ error: "Belgeler alinamadi." }, { status: 500 });
  }
}

/** Yalnizca MEMBER rolundeki kullanicilar silinir (yonetici hesabi korunur). */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Üye silme yalnızca süper yönetici tarafından yapılabilir." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }
    if (user.role !== "MEMBER") {
      return NextResponse.json({ error: "Yalnizca uye hesaplari silinebilir." }, { status: 403 });
    }
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/members/:id]", e);
    return NextResponse.json({ error: "Uye silinemedi." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    const { id } = await params;
    const { action } = bodySchema.parse(await req.json());
    if (action === "resetPassword") {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
      }

      const tempPassword = `Tmp${Math.random().toString(36).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
      const tempHash = await hashPassword(tempPassword);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { password: tempHash },
        select: { id: true, email: true, name: true, password: true, isMemberApproved: true },
      });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          temporaryPassword: tempPassword,
        });
        return NextResponse.json({
          ok: true,
          user: updated,
          temporaryPassword: tempPassword,
          emailSent: true,
        });
      } catch (mailErr) {
        return NextResponse.json({
          ok: true,
          user: updated,
          temporaryPassword: tempPassword,
          emailSent: false,
          emailError: mailErr instanceof Error ? mailErr.message : "Mail gonderilemedi.",
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.user.findUnique({
        where: { id },
        select: { id: true, isMemberApproved: true },
      });
      const nextApproved = action === "approve";
      const user = await tx.user.update({
        where: { id },
        data: { isMemberApproved: nextApproved },
        select: { id: true, isMemberApproved: true },
      });
      if (nextApproved && prev && !prev.isMemberApproved && user.isMemberApproved) {
        await grantWelcomeBonusIfEligible(tx, user.id);
      }
      return user;
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Uye onayi guncellenemedi." }, { status: 500 });
  }
}
