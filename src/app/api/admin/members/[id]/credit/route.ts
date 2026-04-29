import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  amountTry: z.number().int().min(1).max(9_999_999),
});

type Params = { params: Promise<{ id: string }> };

/** Yonetici uyeye kredi yukler (ADJUSTMENT). */
export async function POST(req: Request, { params }: Params) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const { amountTry } = bodySchema.parse(await req.json());

    const user = await prisma.user.findFirst({
      where: { id: userId, role: "MEMBER" },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    const tx = await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: "ADJUSTMENT",
        amountTry,
        description: "Yonetici bakiye yuklemesi",
      },
    });

    return NextResponse.json({ ok: true, transactionId: tx.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz tutar." }, { status: 400 });
    }
    console.error("[POST /api/admin/members/:id/credit]", error);
    return NextResponse.json({ error: "Yukleme yapilamadi." }, { status: 500 });
  }
}
