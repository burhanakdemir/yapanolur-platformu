import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import type { AppUserRole } from "@/lib/adminRoles";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";
import { hashPassword, isBcryptHash, verifyPassword } from "@/lib/passwordHash";
import { createAdminMfaPendingToken, ADMIN_MFA_PENDING_COOKIE } from "@/lib/adminMfaPending";

function isPrismaUserRoleEnumError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return (
    m.includes("UserRole") &&
    (/not found in enum/i.test(m) || /Value\s+['"][^'"]+['"]\s+not found/i.test(m))
  );
}

const bodySchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().email(),
  ),
  /** Kopyala-yapıştırda sondaki boşluk satırı girişi bozmasın */
  password: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1),
  ),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "login");
  if (limited) return limited;

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Gecersiz istek (JSON bekleniyor)." }, { status: 400 });
    }
    const data = bodySchema.parse(raw);
    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: data.email } });
    } catch (e) {
      if (isPrismaUserRoleEnumError(e)) {
        return NextResponse.json(
          {
            error:
              "Prisma istemcisi guncel degil (UserRole). Terminal: npx prisma generate — sonra .next silin ve npm run dev.",
          },
          { status: 503 },
        );
      }
      throw e;
    }

    if (!user) {
      return NextResponse.json({ error: "Gecersiz giris bilgisi." }, { status: 401 });
    }

    const valid = await verifyPassword(data.password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Gecersiz giris bilgisi." }, { status: 401 });
    }

    if (!isBcryptHash(user.password)) {
      const upgraded = await hashPassword(data.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: upgraded },
      });
      user = { ...user, password: upgraded };
    }
    /** Onay bekleyen üye de oturum açabilir; panelde bilgi gösterilir. */

    if (isStaffAdminRole(user.role)) {
      const pendingJwt = await createAdminMfaPendingToken(user.id);
      const res = NextResponse.json({
        ok: true,
        step: "admin_mfa",
        needsEnrollment: !user.adminTotpSecretEnc,
        email: user.email,
      });
      res.cookies.set("session_token", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookie(req),
        path: "/",
        maxAge: 0,
      });
      res.cookies.set(ADMIN_MFA_PENDING_COOKIE, pendingJwt, {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookie(req),
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as AppUserRole,
      lastActivity: Date.now(),
    });

    const res = NextResponse.json({
      ok: true,
      step: "member",
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
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues.map((i) => i.message).join(" ") || "Gecersiz istek.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[POST /api/auth/login]", error);
    if (isPrismaUserRoleEnumError(error)) {
      return NextResponse.json(
        {
          error:
            "Prisma istemcisi guncel degil (UserRole). Terminal: npx prisma generate — sonra .next silin ve npm run dev.",
        },
        { status: 503 },
      );
    }
    const isDev = process.env.NODE_ENV === "development";
    const err = error instanceof Error ? error : null;
    let message = "Giris basarisiz.";
    if (err?.message.includes("AUTH_SECRET")) {
      message =
        "Sunucu yapilandirmasi: .env dosyasina AUTH_SECRET ekleyin (ornek: openssl rand -base64 32).";
    } else if (isDev && err) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
