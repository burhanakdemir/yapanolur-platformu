import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import { normalizeImageSlots, parseMemberWorkExperienceBody } from "@/lib/memberWorkExperienceValidation";
import {
  MEMBER_WORK_EXPERIENCE_INCLUDE,
  serializeMemberWorkExperienceApi,
} from "@/lib/memberWorkExperienceSerialize";

async function professionAndCategoryExist(professionId: string, categoryId: string): Promise<boolean> {
  const [p, c] = await Promise.all([
    prisma.profession.findUnique({ where: { id: professionId }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
  ]);
  return Boolean(p && c);
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Params) {
  try {
    const limited = await rateLimitGuard(req, "workExperience");
    if (limited) return limited;

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.memberWorkExperience.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Gecersiz JSON." }, { status: 400 });
    }

    const parsed = parseMemberWorkExperienceBody(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dogrulama hatasi.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const okIds = await professionAndCategoryExist(data.professionId, data.categoryId);
    if (!okIds) {
      return NextResponse.json({ error: "Gecersiz meslek veya kategori." }, { status: 400 });
    }

    const [imageUrl1, imageUrl2, imageUrl3] = normalizeImageSlots(data.imageUrls);

    const row = await prisma.memberWorkExperience.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        province: data.province,
        district: data.district,
        blockParcel: data.blockParcel,
        durationYears: data.durationYears,
        durationMonths: data.durationMonths,
        durationDays: data.durationDays,
        professionId: data.professionId,
        categoryId: data.categoryId,
        imageUrl1,
        imageUrl2,
        imageUrl3,
      },
      include: MEMBER_WORK_EXPERIENCE_INCLUDE,
    });

    return NextResponse.json({ ok: true, item: serializeMemberWorkExperienceApi(row) });
  } catch (e) {
    console.error("[PATCH /api/member-work-experience/[id]]", e);
    return NextResponse.json({ error: "Guncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Params) {
  try {
    const limited = await rateLimitGuard(req, "workExperience");
    if (limited) return limited;

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const deleted = await prisma.memberWorkExperience.deleteMany({
      where: { id, userId: session.userId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/member-work-experience/[id]]", e);
    return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
  }
}
