import { NextResponse } from "next/server";
import { ADMIN_MFA_PENDING_COOKIE, ADMIN_TOTP_ENROLL_COOKIE } from "@/lib/adminMfaPending";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";

export const dynamic = "force-dynamic";

/** MFA bekleyen çerezleri temizler; kullanıcıyı şifre giriş adımına döndürür. */
export async function POST(req: Request) {
  const secure = shouldUseSecureCookie(req);
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 0 };
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_MFA_PENDING_COOKIE, "", cookieOpts);
  res.cookies.set(ADMIN_TOTP_ENROLL_COOKIE, "", cookieOpts);
  return res;
}
