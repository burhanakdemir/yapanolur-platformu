import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  OTP_PURPOSE_PASSWORD_RESET,
  OTP_SIGNUP_EMAIL_TTL_MINUTES,
  verifyAndConsumeOtp,
} from "@/lib/otp";
import { formatSignupOtpTtlTr } from "@/lib/signupOtpTtl";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { hashPassword } from "@/lib/passwordHash";
import { generateTemporaryPassword } from "@/lib/generateTemporaryPassword";
import { rateLimitGuard } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
  code: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(4)),
});

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "otp");
  if (limited) return limited;

  try {
    const { email, code } = bodySchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Bu e-posta ile kayıtlı hesap bulunamadı." },
        { status: 404 },
      );
    }

    const ok = await verifyAndConsumeOtp(prisma, OTP_PURPOSE_PASSWORD_RESET, email, code);
    if (!ok) {
      return NextResponse.json(
        {
          error: `Kod hatalı veya süresi dolmuş (${formatSignupOtpTtlTr(OTP_SIGNUP_EMAIL_TTL_MINUTES)}). Yeni kod isteyin.`,
        },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    try {
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        temporaryPassword,
      });
    } catch (mailErr) {
      console.error("[forgot-password/verify-and-reset] mail", mailErr);
      return NextResponse.json(
        {
          error:
            "Şifre güncellendi ancak e-posta gönderilemedi. SMTP ayarlarını kontrol edin veya destek ile iletişime geçin.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Yeni şifreniz e-posta adresinize gönderildi. Giriş yaptıktan sonra üye panelinden şifrenizi değiştirebilirsiniz.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[forgot-password/verify-and-reset]", error);
    return NextResponse.json({ error: "Şifre sıfırlama tamamlanamadı." }, { status: 500 });
  }
}
