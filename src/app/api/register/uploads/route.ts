import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import { parseUploadPayload } from "@/lib/parseUploadPayload";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadConstraints";
import { saveUploadedFile, isUploadStorageMisconfiguredError } from "@/lib/uploadStorage";
import { getSignupVerificationFlags } from "@/lib/signupVerificationSettings";
import { SIGNUP_EMAIL_COOKIE, verifySignupEmailProofToken } from "@/lib/signupEmailProof";
import { SIGNUP_PHONE_COOKIE, verifySignupPhoneProofToken } from "@/lib/signupPhoneProof";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";

/**
 * Kayit formunda oturum yokken dosya yukleme (belge/foto URL'i sonra POST /api/register ile kaydolur).
 * Kayit OTP kanit cerezleri + ayarlara gore dogrulama; kotayi signupUpload ile sinirlar.
 */
export async function POST(req: Request) {
  const contentLength = Number.parseInt(req.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES * 2) {
    return NextResponse.json({ error: "Istek govdesi cok buyuk.", code: "payload_too_large" }, { status: 413 });
  }

  const limited = await rateLimitGuard(req, "signupUpload");
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Gecersiz istek govdesi.", code: "invalid_json" }, { status: 400 });
  }

  const parsed = parseUploadPayload(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
  }

  const rawBody = raw as {
    email?: unknown;
    phone?: unknown;
  };
  const email =
    typeof rawBody.email === "string"
      ? rawBody.email.trim().toLowerCase()
      : "";
  if (!z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: "Gecerli bir e-posta adresi gerekli.", code: "invalid_email" }, { status: 400 });
  }

  const phoneRaw = typeof rawBody.phone === "string" ? rawBody.phone.trim() : "";
  const flags = await getSignupVerificationFlags(prisma);

  if (flags.signupEmailVerificationRequired) {
    const proofCookie = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
    const proofOk = await verifySignupEmailProofToken(proofCookie, email);
    if (!proofOk) {
      return NextResponse.json(
        {
          error:
            "E-posta dogrulanmamis veya suresi dolmus. Once e-posta OTP ile kaniti tamamlayin.",
          code: "signup_proof_email",
        },
        { status: 403 },
      );
    }
  }

  const phoneE164 = phoneRaw ? normalizePhoneInputToE164(phoneRaw) : null;
  if (flags.signupPhoneVerificationRequired) {
    if (!phoneE164) {
      return NextResponse.json(
        {
          error: "Kayit icin gecerli bir telefon ve SMS kaniti gerekli.",
          code: "phone_required",
        },
        { status: 400 },
      );
    }
    const phoneProofCookie = (await cookies()).get(SIGNUP_PHONE_COOKIE)?.value;
    const phoneProofOk = await verifySignupPhoneProofToken(phoneProofCookie, email, phoneE164);
    if (!phoneProofOk) {
      return NextResponse.json(
        {
          error:
            "Telefon dogrulanmamis veya suresi dolmus. Once SMS OTP ile kaniti tamamlayin.",
          code: "signup_proof_phone",
        },
        { status: 403 },
      );
    }
  } else if (phoneRaw && !phoneE164) {
    return NextResponse.json(
      {
        error:
          "Gecersiz telefon numarasi. Ornek: +905551234567 veya ulusal format.",
        code: "invalid_phone",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      {
        error: "Bu e-posta zaten kayitli. Giris yapip panelden dosya yukleyin.",
        code: "email_taken",
      },
      { status: 409 },
    );
  }

  try {
    const { url } = await saveUploadedFile(parsed.filename, parsed.buffer);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[register/uploads]", err);
    if (isUploadStorageMisconfiguredError(err)) {
      return NextResponse.json(
        {
          error: "Dosya depolama yapilandirmasi eksik veya kullanılamıyor.",
          code: "storage_config",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Dosya yuklenemedi.", code: "storage_failed" }, { status: 500 });
  }
}
