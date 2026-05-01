import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertOtpRateOk,
  generateSixDigitCode,
  OTP_PURPOSE_SIGNUP_EMAIL,
  OTP_SIGNUP_EMAIL_TTL_MINUTES,
  saveOtpChallenge,
} from "@/lib/otp";
import { sendSignupEmailOtp } from "@/lib/mailer";
import { rateLimitGuard } from "@/lib/rateLimit";
import { SIGNUP_EMAIL_OTP_REQUEST_PUBLIC_HINT_TR } from "@/lib/signupEmailOtpHint";
import { getSignupVerificationFlags } from "@/lib/signupVerificationSettings";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  let emailForLog = "";
  try {
    const { email } = bodySchema.parse(await req.json());
    const target = email.toLowerCase().trim();
    emailForLog = target;

    const flags = await getSignupVerificationFlags(prisma);
    if (!flags.signupEmailVerificationRequired) {
      return NextResponse.json({
        ok: true,
        verificationDisabled: true,
        hint: "Site yöneticisi e-posta doğrulamasını kapattı; kayıt için OTP gerekmez.",
        otpTtlMinutes: OTP_SIGNUP_EMAIL_TTL_MINUTES,
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: target },
      select: { id: true },
    });
    if (existing) {
      if (process.env.NODE_ENV === "development") {
        console.info(
          "[request-email-otp] e-posta gonderilmedi (adres zaten kayitli; enumeration korumasi)",
          target,
        );
      }
      return NextResponse.json({
        ok: true,
        hint: SIGNUP_EMAIL_OTP_REQUEST_PUBLIC_HINT_TR,
        otpTtlMinutes: OTP_SIGNUP_EMAIL_TTL_MINUTES,
      });
    }

    await assertOtpRateOk(prisma, OTP_PURPOSE_SIGNUP_EMAIL, target);
    const code = generateSixDigitCode();
    /** Once kaydet (OTP_PEPPER / DB burada patlar; kullaniciya bos e-posta yok). */
    await saveOtpChallenge(prisma, OTP_PURPOSE_SIGNUP_EMAIL, target, code, OTP_SIGNUP_EMAIL_TTL_MINUTES);
    try {
      await sendSignupEmailOtp({ to: target, code });
    } catch (sendErr) {
      await prisma.otpChallenge.deleteMany({
        where: { purpose: OTP_PURPOSE_SIGNUP_EMAIL, target },
      });
      throw sendErr;
    }
    return NextResponse.json({
      ok: true,
      hint: SIGNUP_EMAIL_OTP_REQUEST_PUBLIC_HINT_TR,
      otpTtlMinutes: OTP_SIGNUP_EMAIL_TTL_MINUTES,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Kod gonderilemedi.";
    console.error("[request-email-otp]", emailForLog, error);
    const status = /SMTP|sunucu|baglan|giris basarisiz|Gonderici/i.test(msg) ? 502 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
