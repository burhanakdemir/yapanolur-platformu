import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { hashPassword } from "@/lib/passwordHash";

const patchSchema = z.object({
  password: z.string().min(4).max(200),
});

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

  await prisma.user.update({
    where: { id: target.id },
    data: { password: await hashPassword(body.password) },
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
