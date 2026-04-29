import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateCategoryRoutes } from "@/lib/revalidateCategoryRoutes";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const bodySchema = z.object({
  direction: z.enum(["up", "down"]),
});

/** Aynı üst kategori altında sırayı yukarı/aşağı kaydırır (sortOrder 0..n-1 yenilenir). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const { direction } = bodySchema.parse(await req.json());

    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) {
      return NextResponse.json({ error: "Kategori bulunamadi." }, { status: 404 });
    }

    const siblings = await prisma.category.findMany({
      where: cat.parentId === null ? { parentId: null } : { parentId: cat.parentId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { name: "asc" }],
    });

    const idx = siblings.findIndex((s) => s.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: "Liste hatasi." }, { status: 500 });
    }

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const reordered = [...siblings];
    const [row] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, row!);

    await prisma.$transaction(
      reordered.map((s, i) =>
        prisma.category.update({ where: { id: s.id }, data: { sortOrder: i } }),
      ),
    );

    revalidateCategoryRoutes();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: 500 },
      );
    }
    const msg = e instanceof Error ? e.message : "Sunucu hatasi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
