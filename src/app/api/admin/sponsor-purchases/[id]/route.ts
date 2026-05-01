import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { canStaffAdminOrGateAdmin } from "@/lib/adminStaffOrGateAuth";
import { createSponsorHeroSlideForMemberTx } from "@/lib/createSponsorHeroSlideForMemberTx";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Params) {
  try {
    const prisma = getPrismaClient();
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!(await canStaffAdminOrGateAdmin())) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    const resolverUserId = session?.userId ?? null;

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Geçersiz kayıt." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçerli işlem gönderin (approve | reject)." }, { status: 400 });
    }
    const { action } = parsed.data;

    const existing = await prisma.sponsorHeroPurchaseRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        periodDays: true,
        amountTryPaid: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Bu başvuru zaten sonuçlanmış." }, { status: 400 });
    }

    if (action === "approve") {
      const user = await prisma.user.findUnique({
        where: { id: existing.userId },
        select: {
          id: true,
          role: true,
          memberNumber: true,
          name: true,
          memberProfile: {
            select: {
              province: true,
              profession: { select: { name: true } },
            },
          },
        },
      });
      if (!user || user.role !== "MEMBER") {
        return NextResponse.json({ error: "Yalnızca üye hesapları için sponsor satırı oluşturulabilir." }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        const slide = await createSponsorHeroSlideForMemberTx(
          tx,
          {
            userId: user.id,
            memberNumber: user.memberNumber,
            name: user.name,
            professionName: user.memberProfile?.profession?.name ?? null,
            province: user.memberProfile?.province ?? null,
          },
          existing.periodDays,
        );

        await tx.sponsorHeroPurchaseRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            homeHeroSlideId: slide.id,
            resolvedAt: new Date(),
            resolvedByUserId: resolverUserId,
          },
        });
      });

      revalidatePath("/");
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, action: "approve" });
    }

    /** reject */
    await prisma.$transaction(async (tx) => {
      let refundId: string | null = null;
      if (existing.amountTryPaid > 0) {
        const refund = await tx.creditTransaction.create({
          data: {
            userId: existing.userId,
            type: "REFUND",
            amountTry: existing.amountTryPaid,
            description: `Ana sayfa sponsorluğu red / iptal (başvuru ${id})`,
            referenceId: id,
          },
        });
        refundId = refund.id;
      }

      await tx.sponsorHeroPurchaseRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          refundCreditTxId: refundId,
          resolvedAt: new Date(),
          resolvedByUserId: resolverUserId,
        },
      });
    });

    return NextResponse.json({ ok: true, action: "reject" });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2021" || e.code === "P2022")) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması güncel değil. Sunucuda `npx prisma migrate deploy` ve `npx prisma generate` çalıştırın.",
        },
        { status: 503 },
      );
    }
    console.error("[POST /api/admin/sponsor-purchases/[id]]", e);
    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
