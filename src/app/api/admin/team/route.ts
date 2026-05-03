import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminTeamManager } from "@/lib/adminTeamManagementAuth";
import { MAX_ADMIN_TEAM_SIZE } from "@/lib/adminRoles";
import { nextMemberNumber } from "@/lib/memberNumber";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/passwordHash";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(200),
  name: z.string().trim().max(120).optional(),
  hasAllProvinces: z.boolean().optional(),
  provinces: z.array(z.string().trim().min(1).max(120)).max(81).optional(),
});

/** Yönetici ekibi (SUPER_ADMIN + ADMIN), şifresiz liste */
export async function GET() {
  const { session, response } = await requireSuperAdminTeamManager();
  if (response) return response;

  const team = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hasAllProvinces: true,
      adminProvinceAccesses: { select: { province: true }, orderBy: { province: "asc" } },
      memberNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    team: team.map((row) => ({
      ...row,
      provinces: row.adminProvinceAccesses.map((p) => p.province),
      adminProvinceAccesses: undefined,
    })),
    maxSize: MAX_ADMIN_TEAM_SIZE,
    selfId: session!.userId,
  });
}

/** Yeni yardımcı yönetici (ADMIN) — ekip limiti adminRoles.ts ile yönetilir */
export async function POST(req: Request) {
  const { response } = await requireSuperAdminTeamManager();
  if (response) return response;

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
  }

  const staffCount = await prisma.user.count({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });
  if (staffCount >= MAX_ADMIN_TEAM_SIZE) {
    return NextResponse.json(
      { error: `Yönetici ekibi en fazla ${MAX_ADMIN_TEAM_SIZE} kişi olabilir.` },
      { status: 400 },
    );
  }

  try {
    const hashed = await hashPassword(body.password);
    const normalizedProvinces = Array.from(
      new Set((body.provinces ?? []).map((p) => p.trim()).filter(Boolean)),
    );
    if (body.hasAllProvinces === false && normalizedProvinces.length === 0) {
      return NextResponse.json(
        { error: "Belirli iller modunda en az bir il seçmelisiniz." },
        { status: 400 },
      );
    }
    const hasAllProvinces =
      body.hasAllProvinces ?? normalizedProvinces.length === 0;
    const user = await prisma.$transaction(async (tx) => {
      const memberNumber = await nextMemberNumber(tx);
      return tx.user.create({
        data: {
          email: body.email,
          password: hashed,
          name: body.name?.trim() || null,
          role: "ADMIN",
          hasAllProvinces,
          adminProvinceAccesses: hasAllProvinces
            ? undefined
            : {
                createMany: {
                  data: normalizedProvinces.map((province) => ({ province })),
                },
              },
          memberNumber,
          isMemberApproved: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          hasAllProvinces: true,
          adminProvinceAccesses: { select: { province: true }, orderBy: { province: "asc" } },
          memberNumber: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        provinces: user.adminProvinceAccesses.map((p) => p.province),
        adminProvinceAccesses: undefined,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }
    console.error("[POST /api/admin/team]", e);
    return NextResponse.json({ error: "Kayıt oluşturulamadı." }, { status: 500 });
  }
}
