import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateCategoryRoutes } from "@/lib/revalidateCategoryRoutes";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

/** Tam http(s) URL veya yerel yol (`/uploads/...`); bos string / null = kaldir. */
function isAllowedCategoryImageUrl(s: string): boolean {
  if (s.startsWith("/")) {
    return !s.includes("..") && s.length >= 2 && s.length < 4096;
  }
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const patchSchema = z
  .object({
    name: z.string().min(2, "En az 2 karakter").optional(),
    imageUrl: z
      .union([
        z.null(),
        z.literal(""),
        z.string().refine(isAllowedCategoryImageUrl, {
          message: "Gecerli bir http(s) adresi veya / ile baslayan yol girin.",
        }),
      ])
      .optional(),
  })
  .refine((d) => d.name !== undefined || d.imageUrl !== undefined, {
    message: "En az name veya imageUrl gerekli.",
  });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const parsed = patchSchema.parse(await req.json());

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
    }

    const data: { name?: string; imageUrl?: string | null } = {};
    if (parsed.name !== undefined) {
      const trimmed = parsed.name.trim();
      if (trimmed.length < 2) {
        return NextResponse.json({ error: "Gecerli bir ad girin." }, { status: 400 });
      }
      data.name = trimmed;
    }
    if (parsed.imageUrl !== undefined) {
      data.imageUrl =
        parsed.imageUrl === "" || parsed.imageUrl === null ? null : parsed.imageUrl;
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });
    revalidateCategoryRoutes();
    return NextResponse.json({ ok: true, category: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Gecersiz veri." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu seviyede ayni isimde baska kategori var." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Guncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const row = await prisma.category.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
  }

  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    return NextResponse.json(
      { error: "Once alt kategorileri silin; ust kategori alt kategoriler varken silinemez." },
      { status: 400 },
    );
  }

  const adCount = await prisma.ad.count({ where: { categoryId: id } });
  if (adCount > 0) {
    return NextResponse.json(
      { error: "Bu kategoride ilan var. Once ilanlari baska kategoriye tasiyin veya silin." },
      { status: 400 },
    );
  }

  await prisma.category.delete({ where: { id } });
  revalidateCategoryRoutes();
  return NextResponse.json({ ok: true, deletedId: id });
}
