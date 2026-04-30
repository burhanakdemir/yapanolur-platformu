import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import {
  OTP_PURPOSE_SIGNUP_PHONE,
  OTP_SIGNUP_PHONE_TTL_MINUTES,
  verifyAndConsumeOtp,
} from "@/lib/otp";
import { formatSignupOtpTtlTr } from "@/lib/signupOtpTtl";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { rateLimitGuard } from "@/lib/rateLimit";
import { verifySignupEmailProofToken, SIGNUP_EMAIL_COOKIE } from "@/lib/signupEmailProof";
import {
  createSignupPhoneProofToken,
  SIGNUP_PHONE_COOKIE,
} from "@/lib/signupPhoneProof";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
  phone: z.string().min(8),
  code: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(4)),
});

function clearPhoneCookie(res: NextResponse, req: Request) {
  res.cookies.set(SIGNUP_PHONE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  try {
    const data = bodySchema.parse(await req.json());
    const proofEmail = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
    const emailOk = await verifySignupEmailProofToken(proofEmail, data.email);
    if (!emailOk) {
      return NextResponse.json(
        { error: "Önce e-postanızı doğrulayın veya oturum süresi dolmuş; yeni e-posta kodu alın." },
        { status: 400 },
      );
    }

    const phoneE164 = normalizePhoneInputToE164(data.phone.trim());
    if (!phoneE164) {
      return NextResponse.json({ error: "Geçerli bir telefon numarası gerekli." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    const ok = await verifyAndConsumeOtp(prisma, OTP_PURPOSE_SIGNUP_PHONE, phoneE164, data.code);
    if (!ok) {
      return NextResponse.json(
        {
          error: `Telefon kodu hatalı veya süresi dolmuş (${formatSignupOtpTtlTr(OTP_SIGNUP_PHONE_TTL_MINUTES)}). Yeni kod isteyip tekrar deneyin.`,
        },
        { status: 400 },
      );
    }

    const token = await createSignupPhoneProofToken(data.email, phoneE164);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SIGNUP_PHONE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(req),
      path: "/",
      maxAge: 15 * 60,
    });
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  clearPhoneCookie(res, req);
  return res;
}
