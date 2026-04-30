import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertOtpRateOk,
  generateSixDigitCode,
  OTP_PURPOSE_SIGNUP_PHONE,
  OTP_SIGNUP_PHONE_TTL_MINUTES,
  saveOtpChallenge,
} from "@/lib/otp";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import { sendSignupSmsOtpDispatch } from "@/lib/signupSmsDispatch";
import { rateLimitGuard } from "@/lib/rateLimit";
import { verifySignupEmailProofToken, SIGNUP_EMAIL_COOKIE } from "@/lib/signupEmailProof";
import { SIGNUP_PHONE_COOKIE } from "@/lib/signupPhoneProof";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
  phone: z.string().min(8),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  try {
    const { phone, email } = bodySchema.parse(await req.json());
    const proofCookie = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
    const emailOk = await verifySignupEmailProofToken(proofCookie, email);
    if (!emailOk) {
      return NextResponse.json(
        { error: "Önce e-postanızı doğrulayın; telefon kodu yalnızca doğrulanmış e-posta ile istenebilir." },
        { status: 400 },
      );
    }

    const target = normalizePhoneInputToE164(phone.trim());
    if (!target) {
      return NextResponse.json(
        { error: "Geçerli bir telefon numarası girin (uluslararası format, örn. +905551234567)." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    await assertOtpRateOk(prisma, OTP_PURPOSE_SIGNUP_PHONE, target);
    const code = generateSixDigitCode();
    const smsResult = await sendSignupSmsOtpDispatch(prisma, target, code);

    const allowLogFallback =
      process.env.NODE_ENV !== "production" ||
      process.env.SIGNUP_OTP_ALLOW_LOG_FALLBACK === "1" ||
      process.env.SIGNUP_OTP_ALLOW_LOG_FALLBACK === "true";

    if (!smsResult.sent) {
      if (!allowLogFallback) {
        return NextResponse.json(
          {
            error:
              "SMS gönderilemedi. Süper yönetici panelinde İleti Merkezi, genel HTTP SMS webhook veya sunucuda Twilio (TWILIO_*) tanımlanmalı. Yapılandırma olmadan telefon doğrulama kodu üretilmez.",
            smsSent: false,
            hint:
              "Yönetim: /admin/signup-sms-provider — İleti Merkezi veya HTTP/Twilio etkin ve eksiksiz olmalı. (Üretimde yedek: SIGNUP_OTP_ALLOW_LOG_FALLBACK=1 sadece acil/operasyon; güvenli akış taşınmış SMS kanalı demektir.)",
          },
          { status: 503 },
        );
      }
      console.warn(
        "[request-phone-otp] SMS kanalı yok; geliştirme / SIGNUP_OTP_ALLOW_LOG_FALLBACK ile OTP yine kaydediliyor",
        target,
      );
    }

    await saveOtpChallenge(prisma, OTP_PURPOSE_SIGNUP_PHONE, target, code, OTP_SIGNUP_PHONE_TTL_MINUTES);

    const res = NextResponse.json({
      ok: true,
      otpTtlMinutes: OTP_SIGNUP_PHONE_TTL_MINUTES,
      smsSent: smsResult.sent,
      channel: smsResult.channel,
      hint: smsResult.sent
        ? undefined
        : "SMS gönderilmedi (kanal yapılandırılmamış). Geliştirme modunda kod yine kaydedildi; üretimde bu durumda istek reddedilir. Sunucu günlüğünde tam metin görünebilir.",
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
    const msg = error instanceof Error ? error.message : "Kod gönderilemedi.";
    const userMsg =
      msg === "TWILIO_YOK" || /twilio/i.test(msg)
        ? "SMS gönderilemedi. Yapılandırmayı kontrol edin."
        : msg;
    console.error("[request-phone-otp]", error);
    return NextResponse.json({ error: userMsg }, { status: 400 });
  }
}
