import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import { checkRegisterAvailability } from "@/lib/registerConflict";
import { rateLimitGuard } from "@/lib/rateLimit";

const bodySchema = z
  .object({
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : undefined),
      z.string().email().optional(),
    ),
    phone: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().optional(),
    ),
  })
  .refine((d) => Boolean(d.email || d.phone), {
    message: "E-posta veya telefon gerekli.",
  });

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "register");
  if (limited) return limited;

  try {
    const data = bodySchema.parse(await req.json());
    const phoneE164 = data.phone ? normalizePhoneInputToE164(data.phone) : null;
    const result = await checkRegisterAvailability(prisma, {
      email: data.email,
      phoneE164,
    });
    return NextResponse.json({
      ok: true,
      emailTaken: result.emailTaken,
      phoneTaken: result.phoneTaken,
      conflict: result.conflict,
      code:
        result.conflict === "both"
          ? "both_taken"
          : result.conflict === "email"
            ? "email_taken"
            : result.conflict === "phone"
              ? "phone_taken"
              : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Kontrol yapılamadı." }, { status: 500 });
  }
}
