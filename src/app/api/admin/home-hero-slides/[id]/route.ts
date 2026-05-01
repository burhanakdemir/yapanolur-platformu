import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";
import { isAllowedHeroCtaUrl, isAllowedHeroImageUrl } from "@/lib/homeHeroSlideValidate";
import { createBodySchema } from "../route";

const patchBodySchema = createBodySchema.partial();

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

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.homeHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Slayt bulunamadı." }, { status: 404 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
    }

    const data = parsed.data;

    const nextSubtitle =
      data.subtitle !== undefined ? trimOrNull(data.subtitle) : existing.subtitle;
    const nextImageUrl =
      data.imageUrl !== undefined ? trimOrNull(data.imageUrl) : existing.imageUrl;
    const nextCtaUrl = data.ctaUrl !== undefined ? trimOrNull(data.ctaUrl) : existing.ctaUrl;
    const nextCtaLabel =
      data.ctaLabel !== undefined ? trimOrNull(data.ctaLabel) : existing.ctaLabel;
    const nextStartsAt =
      data.startsAt !== undefined ? parseOptionalDate(data.startsAt) : existing.startsAt;
    const nextEndsAt =
      data.endsAt !== undefined ? parseOptionalDate(data.endsAt) : existing.endsAt;

    if (nextImageUrl != null && !isAllowedHeroImageUrl(nextImageUrl)) {
      return NextResponse.json({ error: "Görsel URL izin verilen kaynaklardan olmalıdır." }, { status: 400 });
    }
    if (nextCtaUrl != null && !isAllowedHeroCtaUrl(nextCtaUrl)) {
      return NextResponse.json({ error: "CTA bağlantısı güvenli değil veya desteklenmiyor." }, { status: 400 });
    }
    if (nextStartsAt && nextEndsAt && nextEndsAt < nextStartsAt) {
      return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz." }, { status: 400 });
    }

    const slide = await prisma.homeHeroSlide.update({
      where: { id },
      data: {
        ...(data.lang !== undefined ? { lang: data.lang } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.subtitle !== undefined ? { subtitle: nextSubtitle } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: nextImageUrl } : {}),
        ...(data.ctaUrl !== undefined ? { ctaUrl: nextCtaUrl } : {}),
        ...(data.ctaLabel !== undefined ? { ctaLabel: nextCtaLabel } : {}),
        ...(data.isSponsor !== undefined ? { isSponsor: data.isSponsor } : {}),
        ...(data.startsAt !== undefined ? { startsAt: nextStartsAt ?? null } : {}),
        ...(data.endsAt !== undefined ? { endsAt: nextEndsAt ?? null } : {}),
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

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.homeHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Slayt bulunamadı." }, { status: 404 });
    }
    await prisma.homeHeroSlide.delete({ where: { id } });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
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
