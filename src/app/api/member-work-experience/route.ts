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

export async function GET() {
  try {
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

    const rows = await prisma.memberWorkExperience.findMany({
      where: { userId: session.userId },
      orderBy: [{ createdAt: "desc" }],
      include: MEMBER_WORK_EXPERIENCE_INCLUDE,
    });

    return NextResponse.json({ items: rows.map(serializeMemberWorkExperienceApi) });
  } catch (e) {
    console.error("[GET /api/member-work-experience]", e);
    return NextResponse.json({ error: "Liste alinamadi." }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const row = await prisma.memberWorkExperience.create({
      data: {
        userId: session.userId,
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
    console.error("[POST /api/member-work-experience]", e);
    return NextResponse.json({ error: "Kaydedilemedi." }, { status: 500 });
  }
}
