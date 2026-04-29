import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import { invalidateSignupSmsConfigCache, sendSignupSmsOtpDispatch } from "@/lib/signupSmsDispatch";

const bodySchema = z.object({
  phone: z.string().min(8),
});

export async function POST(req: Request) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    return NextResponse.json(
      { error: "Bu işlem yalnızca süper yönetici içindir." },
      { status: 403 },
    );
  }

  try {
    const { phone } = bodySchema.parse(await req.json());
    const e164 = normalizePhoneInputToE164(phone.trim());
    if (!e164) {
      return NextResponse.json({ error: "Geçerli bir E.164 telefon girin." }, { status: 400 });
    }
    invalidateSignupSmsConfigCache();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const result = await sendSignupSmsOtpDispatch(prisma, e164, code);
    return NextResponse.json({
      ok: true,
      channel: result.channel,
      sent: result.sent,
      message: result.sent
        ? `Test kodu gönderildi (kanal: ${result.channel}). Gerçek OTP değildir.`
        : "SMS gönderilemedi: İleti Merkezi, HTTP webhook veya Twilio yapılandırmasını kontrol edin. Kod sunucu günlüğünde görülebilir.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Test başarısız.";
    console.error("[signup-sms-provider test]", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
