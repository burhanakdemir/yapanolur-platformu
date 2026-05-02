import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_MFA_PENDING_COOKIE,
  ADMIN_TOTP_ENROLL_COOKIE,
  verifyAdminMfaPendingToken,
} from "@/lib/adminMfaPending";
import { verifyPassword } from "@/lib/passwordHash";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
});

/**
 * Telefonda Authenticator kaydı silinmiş / cihaz kaybolmuş: kullanıcı MFA bekleyen çerez + hesap şifresi ile
 * sunucudaki TOTP’yi sıfırlar; sayfa yenilenince yeniden QR kurulumu başlar.
 */
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
    return NextResponse.json({ error: "Şifre gerekli." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: pending.userId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, password: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const valid = await verifyPassword(parsed.data.password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Şifre doğrulanamadı." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      adminTotpSecretEnc: null,
      adminTotpEnabledAt: null,
    },
  });

  const secure = shouldUseSecureCookie(req);
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 0 };
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_TOTP_ENROLL_COOKIE, "", cookieOpts);
  return res;
}
