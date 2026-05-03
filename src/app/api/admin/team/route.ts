import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminTeamManager } from "@/lib/adminTeamManagementAuth";
import { MAX_ADMIN_TEAM_SIZE, MAX_SUPER_ADMIN_ACCOUNTS } from "@/lib/adminRoles";
import { nextMemberNumber } from "@/lib/memberNumber";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/passwordHash";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(200),
  name: z.string().trim().max(120).optional(),
  /** Varsayılan yardımcı yönetici; ana yönetici kotası ayrıdır */
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
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
    maxSuperAdmins: MAX_SUPER_ADMIN_ACCOUNTS,
    selfId: session!.userId,
  });
}

/** Yeni yönetici: yardımcı (ADMIN) veya ana (SUPER_ADMIN) — kotlar adminRoles.ts */
export async function POST(req: Request) {
  const { response } = await requireSuperAdminTeamManager();
  if (response) return response;

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const newRole = body.role;

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

  if (newRole === "SUPER_ADMIN") {
    const superCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superCount >= MAX_SUPER_ADMIN_ACCOUNTS) {
      return NextResponse.json(
        {
          error: `En fazla ${MAX_SUPER_ADMIN_ACCOUNTS} ana yönetici (süper yönetici) hesabı olabilir.`,
        },
        { status: 400 },
      );
    }
  }

  try {
    const hashed = await hashPassword(body.password);
    const normalizedProvinces = Array.from(
      new Set((body.provinces ?? []).map((p) => p.trim()).filter(Boolean)),
    );

    let hasAllProvinces: boolean;
    let role: "ADMIN" | "SUPER_ADMIN";
    let provinceCreates: { province: string }[] | undefined;

    if (newRole === "SUPER_ADMIN") {
      role = "SUPER_ADMIN";
      hasAllProvinces = true;
      provinceCreates = undefined;
    } else {
      role = "ADMIN";
      if (body.hasAllProvinces === false && normalizedProvinces.length === 0) {
        return NextResponse.json(
          { error: "Belirli iller modunda en az bir il seçmelisiniz." },
          { status: 400 },
        );
      }
      hasAllProvinces = body.hasAllProvinces ?? normalizedProvinces.length === 0;
      provinceCreates = hasAllProvinces
        ? undefined
        : normalizedProvinces.map((province) => ({ province }));
    }

    const user = await prisma.$transaction(async (tx) => {
      const memberNumber = await nextMemberNumber(tx);
      return tx.user.create({
        data: {
          email: body.email,
          password: hashed,
          name: body.name?.trim() || null,
          role,
          hasAllProvinces,
          adminProvinceAccesses: provinceCreates?.length
            ? {
                createMany: {
                  data: provinceCreates,
                },
              }
            : undefined,
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
