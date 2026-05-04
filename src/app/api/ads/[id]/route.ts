import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { normalizeAdTextForStorage } from "@/lib/adTitleDisplay";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import { isAllowedUploadUrl } from "@/lib/uploadUrl";
import type { Prisma } from "@/generated/prisma/client";

const patchSchema = z
  .object({
    title: z.string().min(4).optional(),
    description: z.string().min(10).optional(),
    city: z.string().min(2).optional(),
    province: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    neighborhood: z.string().min(2).optional(),
    blockNo: z.string().min(1).optional(),
    parcelNo: z.string().min(1).optional(),
    categoryId: z.string().min(4).optional(),
    professionId: z.string().min(1).optional(),
    photos: z.array(z.string().min(1)).max(5).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Bos guncelleme." });

/**
 * İlan sahibi: onay bekleyen veya yayında ilan için kısmi güncelleme.
 * - `AdTitleEditor`: yalnızca `title`
 * - Tam düzenleme formu: başlık, açıklama, konum, kategori, meslek, fotoğraf listesi
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris yapmalisiniz." }, { status: 401 });
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "Bu islem yalnizca uyeler icindir." }, { status: 403 });
    }

    const limited = await rateLimitGuard(req, "adUpdate", { userId: session.userId });
    if (limited) return limited;

    const raw = await req.json();
    const body = patchSchema.parse(raw);

    const ad = await prisma.ad.findFirst({
      where: {
        id,
        ownerId: session.userId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (!ad) {
      return NextResponse.json(
        { error: "Ilan bulunamadi, size ait degil veya duzenlenemez." },
        { status: 404 },
      );
    }

    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
      }
    }
    if (body.professionId) {
      const profession = await prisma.profession.findUnique({ where: { id: body.professionId } });
      if (!profession) {
        return NextResponse.json({ error: "Meslek bulunamadi." }, { status: 404 });
      }
    }

    if (body.photos !== undefined && body.photos.length > 0 && !body.photos.every(isAllowedUploadUrl)) {
      return NextResponse.json({ error: "Gecersiz gorsel adresi." }, { status: 400 });
    }

    const updateData: Prisma.AdUpdateInput = {};
    if (body.title !== undefined) updateData.title = normalizeAdTextForStorage(body.title);
    if (body.description !== undefined) updateData.description = normalizeAdTextForStorage(body.description);
    if (body.city !== undefined) updateData.city = body.city;
    if (body.province !== undefined) updateData.province = body.province;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.neighborhood !== undefined) updateData.neighborhood = body.neighborhood;
    if (body.blockNo !== undefined) updateData.blockNo = body.blockNo;
    if (body.parcelNo !== undefined) updateData.parcelNo = body.parcelNo;
    if (body.categoryId !== undefined) updateData.category = { connect: { id: body.categoryId } };
    if (body.professionId !== undefined) updateData.profession = { connect: { id: body.professionId } };

    await prisma.$transaction(async (tx) => {
      if (body.photos !== undefined) {
        await tx.adPhoto.deleteMany({ where: { adId: id } });
        if (body.photos.length > 0) {
          await tx.adPhoto.createMany({
            data: body.photos.map((url, index) => ({
              adId: id,
              url,
              sortOrder: index,
            })),
          });
        }
      }
      if (Object.keys(updateData).length > 0) {
        await tx.ad.update({
          where: { id },
          data: updateData,
        });
      }
    });

    const updated = await prisma.ad.findUnique({
      where: { id },
      select: { title: true, description: true },
    });

    return NextResponse.json({
      ok: true,
      title: updated?.title,
      description: updated?.description,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Gecersiz veri.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Guncellenemedi." }, { status: 500 });
  }
}
