import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";
import { isAllowedHeroCtaUrl, isAllowedHeroImageUrl } from "@/lib/homeHeroSlideValidate";

const slideLangSchema = z.enum(["tr", "en"]);

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

export const createBodySchema = z.object({
  lang: slideLangSchema,
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  title: z.string().trim().min(1).max(500),
  subtitle: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  ctaUrl: z.string().max(2000).optional().nullable(),
  ctaLabel: z.string().max(200).optional().nullable(),
  isSponsor: z.boolean().optional(),
  startsAt: z.union([z.string(), z.null()]).optional(),
  endsAt: z.union([z.string(), z.null()]).optional(),
});

export async function GET() {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
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
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = createBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
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
    if (e instanceof DatabaseConnectionError || isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Veritabanı bağlantısı yok." },
        { status: 503 },
      );
    }
    throw e;
  }
}
