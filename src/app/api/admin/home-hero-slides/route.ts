import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";
import { isAllowedHeroCtaUrl, isAllowedHeroImageUrl } from "@/lib/homeHeroSlideValidate";
import { canStaffAdminOrGateAdmin } from "@/lib/adminStaffOrGateAuth";
import {
  formatHomeHeroSlideZodError,
  homeHeroSlideCreateBodySchema,
} from "@/lib/homeHeroSlideApiSchema";

function trimOrNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const s = v.trim();
  return s === "" ? null : s;
}

function parseOptionalDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  try {
    if (!(await canStaffAdminOrGateAdmin())) {
      return NextResponse.json(
        { error: "Yetkisiz. Yönetici oturumu veya panel şifresi gerekir." },
        { status: 403 },
      );
    }

    const slides = await prisma.homeHeroSlide.findMany({
      orderBy: [{ lang: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(slides);
  } catch (e) {
    if (e instanceof DatabaseConnectionError || isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Veritabanı bağlantısı yok." },
        { status: 503 },
      );
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    if (!(await canStaffAdminOrGateAdmin())) {
      return NextResponse.json(
        { error: "Yetkisiz. Yönetici oturumu veya panel şifresi gerekir." },
        { status: 403 },
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = homeHeroSlideCreateBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: formatHomeHeroSlideZodError(parsed) }, { status: 400 });
    }

    const data = parsed.data;
    const subtitle = trimOrNull(data.subtitle ?? undefined);
    const imageUrl = trimOrNull(data.imageUrl ?? undefined);
    const ctaUrl = trimOrNull(data.ctaUrl ?? undefined);
    const ctaLabel = trimOrNull(data.ctaLabel ?? undefined);
    const startsAt = parseOptionalDate(data.startsAt);
    const endsAt = parseOptionalDate(data.endsAt);

    if (imageUrl != null && !isAllowedHeroImageUrl(imageUrl)) {
      return NextResponse.json({ error: "Görsel URL izin verilen kaynaklardan olmalıdır." }, { status: 400 });
    }
    if (ctaUrl != null && !isAllowedHeroCtaUrl(ctaUrl)) {
      return NextResponse.json({ error: "CTA bağlantısı güvenli değil veya desteklenmiyor." }, { status: 400 });
    }
    if (startsAt && endsAt && endsAt < startsAt) {
      return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz." }, { status: 400 });
    }

    const slide = await prisma.homeHeroSlide.create({
      data: {
        lang: data.lang,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        title: data.title.trim(),
        subtitle,
        imageUrl,
        ctaUrl,
        ctaLabel,
        isSponsor: data.isSponsor ?? false,
        startsAt: startsAt ?? undefined,
        endsAt: endsAt ?? undefined,
      },
    });

    revalidatePath("/");
    return NextResponse.json(slide);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "HomeHeroSlide tablosu bulunamadı. Üretimde veya yerelde şema güncelleyin: npx prisma migrate deploy",
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
