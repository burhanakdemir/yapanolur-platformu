import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  deleteAllSubcategoriesFromDb,
  ensureDefaultTopCategories,
  getCategoryTree,
} from "@/lib/categories";
import { Prisma } from "@/generated/prisma/client";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
} from "@/lib/dbErrors";
import { revalidateCategoryRoutes } from "@/lib/revalidateCategoryRoutes";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const bodySchema = z.object({
  name: z.string().min(2),
  parentId: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    await ensureDefaultTopCategories();
    const tree = await getCategoryTree();
    return NextResponse.json(tree);
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
    if (
      raw &&
      typeof raw === "object" &&
      raw !== null &&
      "deleteAllSubcategories" in raw &&
      (raw as { deleteAllSubcategories?: unknown }).deleteAllSubcategories === true
    ) {
      try {
        const result = await deleteAllSubcategoriesFromDb();
        revalidateCategoryRoutes();
        return NextResponse.json({
          ok: true,
          deleted: result.deleted,
          adsDetached: result.adsDetached,
        });
      } catch (e) {
        console.error("[admin/categories] deleteAllSubcategories:", e);
        return NextResponse.json({ error: "Alt kategoriler silinemedi." }, { status: 500 });
      }
    }

    const data = bodySchema.parse(raw);
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        return NextResponse.json({ error: "Ust kategori bulunamadi." }, { status: 404 });
      }
    }
    const parentKey = data.parentId || null;
    const maxSort = await prisma.category.aggregate({
      where: parentKey === null ? { parentId: null } : { parentId: parentKey },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const created = await prisma.category.create({
      data: {
        name: data.name,
        parentId: parentKey,
        sortOrder,
      },
    });
    revalidateCategoryRoutes();
    return NextResponse.json({ ok: true, category: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ayni isimde kategori bu seviyede zaten var." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Kategori eklenemedi." }, { status: 500 });
  }
}
