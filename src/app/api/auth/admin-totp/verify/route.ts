import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import type { AppUserRole } from "@/lib/adminRoles";
import { ADMIN_MFA_PENDING_COOKIE, verifyAdminMfaPendingToken } from "@/lib/adminMfaPending";
import { decryptAdminTotpSecret } from "@/lib/adminTotpCrypto";
import { verifyTotpCode } from "@/lib/adminTotpCore";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.preprocess((v) => (typeof v === "string" ? v.trim().replace(/\s/g, "") : v), z.string().min(6).max(8)),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "adminTotp");
  if (limited) return limited;

  const c = await cookies();
  const pending = await verifyAdminMfaPendingToken(c.get(ADMIN_MFA_PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json(
      { error: "Oturum süresi doldu. Tekrar giriş yapın.", sessionExpired: true },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz kod." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: pending.userId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: {
      id: true,
      email: true,
      role: true,
      adminTotpSecretEnc: true,
      isMemberApproved: true,
      name: true,
    },
  });

  if (!user?.adminTotpSecretEnc) {
    return NextResponse.json({ error: "Önce Authenticator kurulumunu tamamlayın." }, { status: 400 });
  }

  let secretPlain: string;
  try {
    secretPlain = decryptAdminTotpSecret(user.adminTotpSecretEnc);
  } catch {
    return NextResponse.json({ error: "TOTP yapılandırması okunamadı." }, { status: 500 });
  }

  if (!(await verifyTotpCode(secretPlain, parsed.data.code))) {
    return NextResponse.json({ error: "Geçersiz doğrulama kodu." }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as AppUserRole,
    adminTotp: true,
  });

  const res = NextResponse.json({
    ok: true,
    step: "complete",
    user: {
      email: user.email,
      role: user.role,
      name: user.name,
      memberPendingApproval: user.role === "MEMBER" ? !user.isMemberApproved : false,
    },
  });
  res.cookies.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  res.cookies.set(ADMIN_MFA_PENDING_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
