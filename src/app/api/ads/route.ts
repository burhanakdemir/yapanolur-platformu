import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAdTextForStorage } from "@/lib/adTitleDisplay";
import { createAdWithListingNumber } from "@/lib/adListingNumber";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { isAllowedUploadUrl } from "@/lib/uploadUrl";
import type { Prisma } from "@/generated/prisma/client";

const createAdSchema = z.object({
  categoryId: z.string().min(4),
  professionId: z.string().min(1, "Meslek secin."),
  title: z.string().min(4),
  description: z.string().min(10),
  city: z.string().min(2),
  province: z.string().min(2),
  district: z.string().min(2),
  neighborhood: z.string().min(2),
  blockNo: z.string().min(1),
  parcelNo: z.string().min(1),
  startingPriceTry: z.number().int().min(100).max(99_999_999).default(1000),
  auctionDurationDays: z.number().int().min(1).max(30).default(7),
  photos: z.array(z.string().min(1)).max(5).optional().default([]),
});

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Ilan verebilmek icin giris yapin." }, { status: 401 });
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "Ilan ekleme sadece uyeler icindir." }, { status: 403 });
    }

    const limited = await rateLimitGuard(req, "adCreate", { userId: session.userId });
    if (limited) return limited;

    const raw = await req.json();
    const data = createAdSchema.parse({
      ...raw,
      title: normalizeAdTextForStorage(String(raw.title ?? "")),
      description: normalizeAdTextForStorage(String(raw.description ?? "")),
    });
    const owner = await prisma.user.findUnique({ where: { id: session.userId } });

    if (!owner) {
      return NextResponse.json(
        { error: "Ilan verebilmek icin once uye kaydi yapin." },
        { status: 404 },
      );
    }
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
    }
    const profession = await prisma.profession.findUnique({ where: { id: data.professionId } });
    if (!profession) {
      return NextResponse.json({ error: "Meslek bulunamadi." }, { status: 404 });
    }
    const photoUrls = data.photos ?? [];
    if (photoUrls.length > 0 && !photoUrls.every(isAllowedUploadUrl)) {
      return NextResponse.json({ error: "Gecersiz gorsel adresi." }, { status: 400 });
    }

    const createPayload: Omit<Prisma.AdCreateInput, "listingNumber"> = {
      owner: { connect: { id: owner.id } },
      category: { connect: { id: data.categoryId } },
      profession: { connect: { id: data.professionId } },
      title: data.title,
      description: data.description,
      startingPriceTry: data.startingPriceTry,
      auctionEndsAt: new Date(Date.now() + data.auctionDurationDays * 24 * 60 * 60 * 1000),
      city: data.city,
      province: data.province,
      district: data.district,
      neighborhood: data.neighborhood,
      blockNo: data.blockNo,
      parcelNo: data.parcelNo,
    };
    if (photoUrls.length > 0) {
      createPayload.photos = {
        create: photoUrls.map((url, index) => ({ url, sortOrder: index })),
      };
    }

    const ad = await createAdWithListingNumber(prisma, createPayload);

    return NextResponse.json({ ok: true, adId: ad.id, listingNumber: ad.listingNumber });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Ilan olusturulamadi." }, { status: 500 });
  }
}
