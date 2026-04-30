import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  OTP_PURPOSE_SIGNUP_EMAIL,
  OTP_SIGNUP_EMAIL_TTL_MINUTES,
  verifyAndConsumeOtp,
} from "@/lib/otp";
import { formatSignupOtpTtlTr } from "@/lib/signupOtpTtl";
import { createSignupEmailProofToken, SIGNUP_EMAIL_COOKIE } from "@/lib/signupEmailProof";
import { SIGNUP_PHONE_COOKIE } from "@/lib/signupPhoneProof";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
  code: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(4)),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  try {
    const data = bodySchema.parse(await req.json());
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayitli." }, { status: 409 });
    }

    const ok = await verifyAndConsumeOtp(prisma, OTP_PURPOSE_SIGNUP_EMAIL, data.email, data.code);
    if (!ok) {
      return NextResponse.json(
        {
          error: `Kod hatali veya suresi dolmus (${formatSignupOtpTtlTr(OTP_SIGNUP_EMAIL_TTL_MINUTES)}). Yeni kod isteyip tekrar deneyin.`,
        },
        { status: 400 },
      );
    }

    const token = await createSignupEmailProofToken(data.email);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SIGNUP_EMAIL_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
      maxAge: 2 * 60 * 60,
    });
    res.cookies.set(SIGNUP_PHONE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Dogrulama basarisiz." }, { status: 500 });
  }
}

/** Cikis / e-posta degisimi: kanit cerezini sil (istege bagli GET ile). */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SIGNUP_EMAIL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
