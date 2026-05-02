import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import type { AppUserRole } from "@/lib/adminRoles";
import {
  ADMIN_MFA_PENDING_COOKIE,
  ADMIN_TOTP_ENROLL_COOKIE,
  verifyAdminMfaPendingToken,
  verifyTotpEnrollToken,
} from "@/lib/adminMfaPending";
import { encryptAdminTotpSecret } from "@/lib/adminTotpCrypto";
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
  const enroll = await verifyTotpEnrollToken(c.get(ADMIN_TOTP_ENROLL_COOKIE)?.value);
  if (!pending || !enroll || pending.userId !== enroll.userId) {
    return NextResponse.json(
      { error: "Kurulum oturumu geçersiz. Tekrar deneyin.", sessionExpired: true },
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

  if (!verifyTotpCode(enroll.secretBase32, parsed.data.code)) {
    return NextResponse.json({ error: "Geçersiz doğrulama kodu." }, { status: 401 });
  }

  const enc = encryptAdminTotpSecret(enroll.secretBase32);
  const now = new Date();

  await prisma.user.update({
    where: { id: enroll.userId },
    data: {
      adminTotpSecretEnc: enc,
      adminTotpEnabledAt: now,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: enroll.userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isMemberApproved: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 500 });
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
  res.cookies.set(ADMIN_TOTP_ENROLL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
