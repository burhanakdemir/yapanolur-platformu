import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import qrcode from "qrcode";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_MFA_PENDING_COOKIE,
  ADMIN_TOTP_ENROLL_COOKIE,
  verifyAdminMfaPendingToken,
  createTotpEnrollToken,
} from "@/lib/adminMfaPending";
import { generateTotpSecretBase32, buildAdminTotpKeyUri } from "@/lib/adminTotpCore";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";

/** Authenticator’da görünen servis adı (hostname yerine sabit marka). */
const ADMIN_TOTP_ISSUER = process.env.ADMIN_TOTP_ISSUER?.trim() || "YapanolurTR";

export const dynamic = "force-dynamic";

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

  const user = await prisma.user.findFirst({
    where: { id: pending.userId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, email: true, adminTotpSecretEnc: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }
  if (user.adminTotpSecretEnc) {
    return NextResponse.json({ error: "TOTP zaten kurulu." }, { status: 400 });
  }

  const secret = generateTotpSecretBase32();
  const enrollJwt = await createTotpEnrollToken(user.id, secret);

  const otpauthUrl = buildAdminTotpKeyUri(user.email, secret, ADMIN_TOTP_ISSUER);

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await qrcode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  } catch {
    qrDataUrl = null;
  }

  const res = NextResponse.json({
    ok: true,
    otpauthUrl,
    qrDataUrl,
    email: user.email,
  });
  res.cookies.set(ADMIN_TOTP_ENROLL_COOKIE, enrollJwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 900,
  });
  return res;
}
