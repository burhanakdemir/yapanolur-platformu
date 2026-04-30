import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { hashPassword } from "@/lib/passwordHash";

const patchSchema = z
  .object({
    password: z.string().min(4).max(200).optional(),
    hasAllProvinces: z.boolean().optional(),
    provinces: z.array(z.string().trim().min(1).max(120)).max(81).optional(),
  })
  .refine(
    (v) =>
      typeof v.password === "string" ||
      typeof v.hasAllProvinces === "boolean" ||
      Array.isArray(v.provinces),
    { message: "En az bir alan gonderin." },
  );

type Params = { params: Promise<{ id: string }> };

async function requireSuperAdminSession() {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isSuperAdminRole(session.role)) {
    return { session: null as Awaited<ReturnType<typeof verifySessionToken>>, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { session, response: null };
}

export async function PATCH(req: Request, { params }: Params) {
  const { response } = await requireSuperAdminSession();
  if (response) return response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Geçersiz." }, { status: 400 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const normalizedProvinces = Array.from(
    new Set((body.provinces ?? []).map((p) => p.trim()).filter(Boolean)),
  );
  await prisma.$transaction(async (tx) => {
    const data: {
      password?: string;
      hasAllProvinces?: boolean;
    } = {};
    if (typeof body.password === "string") {
      data.password = await hashPassword(body.password);
    }
    if (typeof body.hasAllProvinces === "boolean") {
      data.hasAllProvinces = body.hasAllProvinces;
    }
    if (Object.keys(data).length > 0) {
      await tx.user.update({ where: { id: target.id }, data });
    }
    if (Array.isArray(body.provinces) || body.hasAllProvinces === false) {
      await tx.adminProvinceAccess.deleteMany({ where: { adminUserId: target.id } });
      const effectiveHasAll =
        typeof body.hasAllProvinces === "boolean"
          ? body.hasAllProvinces
          : normalizedProvinces.length === 0;
      if (!effectiveHasAll && normalizedProvinces.length > 0) {
        await tx.adminProvinceAccess.createMany({
          data: normalizedProvinces.map((province) => ({
            adminUserId: target.id,
            province,
          })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { session, response } = await requireSuperAdminSession();
  if (response) return response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Geçersiz." }, { status: 400 });
  }

  if (id === session!.userId) {
    return NextResponse.json({ error: "Kendi hesabınızı buradan silemezsiniz." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN") {
    const superCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "Son ana yönetici hesabı silinemez." },
        { status: 400 },
      );
    }
  }

  await prisma.user.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}
