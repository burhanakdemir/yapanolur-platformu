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

const bodySchema = z.object({
  memberNumber: z.number().int().min(1),
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

    const { memberNumber } = parsed.data;

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

    /**
     * Tarih aralığı sınırı saat dilimi / saat eşleşmesiyle slaytı dışlayabiliyordu.
     * Üye no ile eklenen sponsorlar: süre bitişi panelde / hero düzenlemede ayarlanana kadar her zaman aktif.
     */
    const startsAt: null = null;
    const endsAt: null = null;

    const titleBase = user.name?.trim() || `Üye ${user.memberNumber}`;
    const subtitleParts = [user.memberProfile?.profession?.name, user.memberProfile?.province].filter(
      (x): x is string => Boolean(x?.trim()),
    );
    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : null;

    /** Tek kayıt: yalnızca TR slayt (liste ve panelde çift satır oluşmasın). İngilizce metin için Hero slayt’tan EN ekleyin. */
    const slide = await prisma.$transaction(async (tx) => {
      await tx.homeHeroSlide.deleteMany({ where: { sponsorUserId: user.id } });

      const maxTr = await tx.homeHeroSlide.aggregate({
        where: { lang: "tr" },
        _max: { sortOrder: true },
      });
      const sortTr = (maxTr._max.sortOrder ?? -1) + 1;

      return tx.homeHeroSlide.create({
        data: {
          lang: "tr",
          sortOrder: sortTr,
          active: true,
          title: titleBase,
          subtitle,
          imageUrl: null,
          ctaUrl: `/uye/${user.id}`,
          ctaLabel: "Profil",
          isSponsor: true,
          sponsorUserId: user.id,
          startsAt,
          endsAt,
        },
      });
    });

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
