import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertOtpRateOk,
  generateSixDigitCode,
  OTP_PURPOSE_PASSWORD_RESET,
  OTP_SIGNUP_EMAIL_TTL_MINUTES,
  saveOtpChallenge,
} from "@/lib/otp";
import { sendPasswordResetEmailOtp } from "@/lib/mailer";
import { rateLimitGuard } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  let emailForLog = "";
  try {
    const { email } = bodySchema.parse(await req.json());
    emailForLog = email;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Bu e-posta ile kayıtlı hesap bulunamadı." },
        { status: 404 },
      );
    }

    await assertOtpRateOk(prisma, OTP_PURPOSE_PASSWORD_RESET, email);
    const code = generateSixDigitCode();
    await saveOtpChallenge(prisma, OTP_PURPOSE_PASSWORD_RESET, email, code, OTP_SIGNUP_EMAIL_TTL_MINUTES);
    try {
      await sendPasswordResetEmailOtp({ to: email, code });
    } catch (sendErr) {
      await prisma.otpChallenge.deleteMany({
        where: { purpose: OTP_PURPOSE_PASSWORD_RESET, target: email },
      });
      throw sendErr;
    }

    return NextResponse.json({
      ok: true,
      otpTtlMinutes: OTP_SIGNUP_EMAIL_TTL_MINUTES,
      hint: "E-posta adresinize doğrulama kodu gönderildi.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Kod gönderilemedi.";
    console.error("[forgot-password/request-otp]", emailForLog, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
