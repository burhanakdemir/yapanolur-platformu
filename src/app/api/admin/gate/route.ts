import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken } from "@/lib/auth";
import { ADMIN_GATE_COOKIE } from "@/lib/adminGate";
import type { AppUserRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";
import { hashPassword, isBcryptHash, verifyPassword } from "@/lib/passwordHash";

const bodySchema = z.object({
  /** Yalnızca veritabanında SUPER_ADMIN rolü olan hesaplardan birinin şifresi (düz metin, login ile aynı). */
  password: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1),
  ),
});

/**
 * Giriş formundaki “panel şifresi”: ortam değişkeni değil, SUPER_ADMIN hesabı şifresi.
 * Doğrulanınca söz konusu kullanıcı için session_token set edilir (süper yönetici arayüzü).
 */
export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "adminGate");
  if (limited) return limited;

  try {
    const { password } = bodySchema.parse(await req.json());

    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isMemberApproved: true,
      },
    });

    if (superAdmins.length === 0) {
      return NextResponse.json(
        {
          error: "Sistemde SUPER_ADMIN hesabı yok. Once seed veya veritabanında bir süper yönetici atayın.",
        },
        { status: 503 },
      );
    }

    let matched: (typeof superAdmins)[number] | undefined;
    for (const u of superAdmins) {
      if (await verifyPassword(password, u.password)) {
        matched = u;
        if (!isBcryptHash(u.password)) {
          const upgraded = await hashPassword(password);
          await prisma.user.update({ where: { id: u.id }, data: { password: upgraded } });
        }
        break;
      }
    }
    if (!matched) {
      return NextResponse.json({ error: "Geçersiz şifre." }, { status: 401 });
    }
    const user = matched;

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as AppUserRole,
    });

    const res = NextResponse.json({
      ok: true,
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
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Islem basarisiz." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
