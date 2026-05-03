import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, type SessionPayload } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";

const FORBIDDEN = NextResponse.json(
  { error: "Bu işlem yalnızca süper yönetici tarafından yapılabilir." },
  { status: 403 },
);

/**
 * Yönetici ekibi (yardımcı admin oluşturma / silme / şifre): yalnızca gerçek süper yönetici.
 * JWT + TOTP + veritabanı rolü birlikte doğrulanır.
 */
export async function requireSuperAdminTeamManager(): Promise<
  { session: SessionPayload; response: null } | { session: null; response: NextResponse }
> {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isSuperAdminRole(session.role) || session.adminTotp !== true) {
    return { session: null, response: FORBIDDEN };
  }

  const row = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  if (row?.role !== "SUPER_ADMIN") {
    return { session: null, response: FORBIDDEN };
  }

  return { session, response: null };
}
