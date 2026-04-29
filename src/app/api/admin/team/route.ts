import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole, MAX_ADMIN_TEAM_SIZE } from "@/lib/adminRoles";
import { nextMemberNumber } from "@/lib/memberNumber";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/passwordHash";

const postSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4).max(200),
  name: z.string().trim().max(120).optional(),
});

async function requireSuperAdminSession() {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isSuperAdminRole(session.role)) {
    return { session: null as Awaited<ReturnType<typeof verifySessionToken>>, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { session, response: null };
}

/** Yönetici ekibi (SUPER_ADMIN + ADMIN), şifresiz liste */
export async function GET() {
  const { session, response } = await requireSuperAdminSession();
  if (response) return response;

  const team = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      memberNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    team,
    maxSize: MAX_ADMIN_TEAM_SIZE,
    selfId: session!.userId,
  });
}

/** Yeni yardımcı yönetici (ADMIN) — en fazla 3 kişilik ekip */
export async function POST(req: Request) {
  const { response } = await requireSuperAdminSession();
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
    const user = await prisma.$transaction(async (tx) => {
      const memberNumber = await nextMemberNumber(tx);
      return tx.user.create({
        data: {
          email: body.email,
          password: hashed,
          name: body.name?.trim() || null,
          role: "ADMIN",
          memberNumber,
          isMemberApproved: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          memberNumber: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }
    console.error("[POST /api/admin/team]", e);
    return NextResponse.json({ error: "Kayıt oluşturulamadı." }, { status: 500 });
  }
}
