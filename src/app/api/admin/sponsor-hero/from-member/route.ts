import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";
import { createSponsorHeroSlideForMemberTx } from "@/lib/createSponsorHeroSlideForMemberTx";
import { isSponsorHeroDurationDays } from "@/lib/sponsorHeroPricing";

const bodySchema = z.object({
  memberNumber: z.number().int().min(1),
  /** Yayın süresi (gün); bitiş tarihi buna göre hesaplanır. */
  periodDays: z
    .number()
    .int()
    .refine((n) => isSponsorHeroDurationDays(n), {
      message: "periodDays must be one of sponsor tiers",
    })
    .optional()
    .default(30),
});

export async function POST(req: Request) {
  try {
    const c = await cookies();
    const session = await verifySessionToken(c.get("session_token")?.value);
    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json({ error: "Yalnızca süper yönetici üye numarasıyla sponsor ekleyebilir." }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçerli bir üye numarası girin." }, { status: 400 });
    }

    const { memberNumber, periodDays } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { memberNumber },
      select: {
        id: true,
        memberNumber: true,
        name: true,
        role: true,
        memberProfile: {
          select: {
            province: true,
            profession: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Bu üye numarası bulunamadı." }, { status: 404 });
    }

    if (user.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Yalnızca üye rolündeki hesaplar ana sayfa sponsor şeridine eklenebilir." },
        { status: 400 },
      );
    }

    /** Tek kayıt: yalnızca TR slayt (liste ve panelde çift satır oluşmasın). İngilizce metin için Hero slayt’tan EN ekleyin. */
    const slide = await prisma.$transaction(async (tx) =>
      createSponsorHeroSlideForMemberTx(
        tx,
        {
          userId: user.id,
          memberNumber: user.memberNumber,
          name: user.name,
          professionName: user.memberProfile?.profession?.name ?? null,
          province: user.memberProfile?.province ?? null,
        },
        periodDays,
      ),
    );

    revalidatePath("/");
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      memberNumber: user.memberNumber,
      slideId: slide.id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Veritabanında sponsor sütunları yok. Sunucuda: npx prisma migrate deploy && npx prisma generate",
        },
        { status: 503 },
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "HomeHeroSlide tablosu bulunamadı. Şema güncelleyin: npx prisma migrate deploy && npx prisma generate",
        },
        { status: 503 },
      );
    }
    if (e instanceof DatabaseConnectionError || isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Veritabanı bağlantısı yok." },
        { status: 503 },
      );
    }
    throw e;
  }
}
