import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminTeamManager } from "@/lib/adminTeamManagementAuth";
import { hashPassword } from "@/lib/passwordHash";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  password: z.string().min(4).max(200).optional(),
  /** İl tablosu güncellemesi için zorunlu (çağrıda mutlaka gönderilir); yalnız şifre güncellerken gönderilmez. */
  hasAllProvinces: z.boolean().optional(),
  provinces: z.array(z.string().trim().min(1).max(120)).max(81).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { response } = await requireSuperAdminTeamManager();
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

  const updatingPassword = typeof body.password === "string";
  const updatingProvinceScope = typeof body.hasAllProvinces === "boolean";
  if (!updatingPassword && !updatingProvinceScope) {
    return NextResponse.json({ error: "En az bir alan gönderin." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  if (target.role === "SUPER_ADMIN" && updatingProvinceScope) {
    return NextResponse.json(
      { error: "Ana yönetici hesapları il ile kısıtlanamaz." },
      { status: 400 },
    );
  }

  const normalizedProvinces = Array.from(
    new Set((body.provinces ?? []).map((p) => p.trim()).filter(Boolean)),
  );

  if (updatingProvinceScope && body.hasAllProvinces === false && normalizedProvinces.length === 0) {
    return NextResponse.json(
      { error: "Belirli iller seçiliyken en az bir il işaretleyin veya «tüm iller» seçeneğini açın." },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userData: { password?: string; hasAllProvinces?: boolean } = {};
      if (updatingPassword) {
        userData.password = await hashPassword(body.password!);
      }
      if (updatingProvinceScope) {
        userData.hasAllProvinces = body.hasAllProvinces!;
      }
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: target.id }, data: userData });
      }

      if (updatingProvinceScope) {
        await tx.adminProvinceAccess.deleteMany({ where: { adminUserId: target.id } });
        if (!body.hasAllProvinces && normalizedProvinces.length > 0) {
          await tx.adminProvinceAccess.createMany({
            data: normalizedProvinces.map((province) => ({
              adminUserId: target.id,
              province,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: target.id },
      select: {
        hasAllProvinces: true,
        adminProvinceAccesses: { select: { province: true }, orderBy: { province: "asc" } },
      },
    });

    return NextResponse.json({
      ok: true,
      hasAllProvinces: refreshed?.hasAllProvinces ?? false,
      provinces: refreshed?.adminProvinceAccesses.map((p) => p.province) ?? [],
    });
  } catch (e) {
    console.error("[PATCH /api/admin/team/[id]]", e);
    return NextResponse.json({ error: "Güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { session, response } = await requireSuperAdminTeamManager();
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
