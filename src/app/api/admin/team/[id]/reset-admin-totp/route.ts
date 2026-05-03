import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminTeamManager } from "@/lib/adminTeamManagementAuth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Yalnızca SUPER_ADMIN + TOTP tamamlanmış oturum.
 * Hedef: ADMIN veya SUPER_ADMIN — TOTP alanlarını sıfırlar (yeniden kurulum gerekir).
 */
export async function POST(_req: Request, { params }: Params) {
  const { response } = await requireSuperAdminTeamManager();
  if (response) return response;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz." }, { status: 400 });
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
    data: {
      adminTotpSecretEnc: null,
      adminTotpEnabledAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
