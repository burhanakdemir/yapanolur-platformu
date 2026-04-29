import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaultProfessionsIfEmpty } from "@/lib/defaultProfessions";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const postSchema = z.object({
  name: z.string().min(2).max(120),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    await ensureDefaultProfessionsIfEmpty(prisma);
    const list = await prisma.profession.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("[GET /api/admin/professions]", e);
    return NextResponse.json({ error: "Liste alinamadi." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    await ensureDefaultProfessionsIfEmpty(prisma);
    const data = postSchema.parse(await req.json());
    const created = await prisma.profession.create({
      data: {
        name: data.name.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ ok: true, profession: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde meslek zaten var." }, { status: 400 });
    }
    console.error("[POST /api/admin/professions]", error);
    const hint =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      {
        error: "Meslek eklenemedi.",
        ...(hint ? { details: hint } : {}),
      },
      { status: 500 },
    );
  }
}
