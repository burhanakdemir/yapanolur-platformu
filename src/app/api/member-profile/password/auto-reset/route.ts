import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import { hashPassword } from "@/lib/passwordHash";
import { generateTemporaryPassword } from "@/lib/generateTemporaryPassword";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const limited = await rateLimitGuard(req, "passwordChange", { userId: session.userId });
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(temporaryPassword) },
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        temporaryPassword,
      });
    } catch (mailErr) {
      console.error("[member-profile/password/auto-reset] mail", mailErr);
      return NextResponse.json(
        {
          error:
            "Şifre güncellendi ancak e-posta gönderilemedi. Destek ile iletişime geçin veya tekrar deneyin.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Yeni şifreniz ${user.email} adresine gönderildi.`,
    });
  } catch (error) {
    console.error("[member-profile/password/auto-reset]", error);
    return NextResponse.json({ error: "Otomatik şifre sıfırlama başarısız." }, { status: 500 });
  }
}
