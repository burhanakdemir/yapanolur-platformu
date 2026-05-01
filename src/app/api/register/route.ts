import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextMemberNumber } from "@/lib/memberNumber";
import { insertMemberUser } from "@/lib/memberUserInsert";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import { rateLimitGuard } from "@/lib/rateLimit";
import { digitsOnly, isValidTcKimlik, isValidVknFormat } from "@/lib/trBillingIds";
import { hashPassword } from "@/lib/passwordHash";
import { SIGNUP_EMAIL_COOKIE, verifySignupEmailProofToken } from "@/lib/signupEmailProof";
import { SIGNUP_PHONE_COOKIE, verifySignupPhoneProofToken } from "@/lib/signupPhoneProof";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";
import { getSignupVerificationFlags } from "@/lib/signupVerificationSettings";

/** Kayıtta e-posta ve telefon verify-* ile doğrulanır (httpOnly kanıt çerezleri). */
function optionalTrimmedString() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : String(v).trim() || undefined),
    z.string().optional(),
  );
}

/** Tam URL veya uygulama icin /uploads/... gibi goreli yollar (z.string().url() goreli path kabul etmez). */
function optionalProfilePhotoUrl() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : String(v).trim() || undefined),
    z.union([z.string().url(), z.string().regex(/^\/\S+$/)]).optional(),
  );
}

function optionalMemberDocumentUrl() {
  return optionalProfilePhotoUrl();
}

const bodySchema = z
  .object({
    email: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().email()),
    name: z.string().min(2),
    password: z.string().min(4),
    profilePhotoUrl: optionalProfilePhotoUrl(),
    phone: z.preprocess((v) => (v === null || v === undefined ? "" : String(v).trim()), z.string()),
    province: z.string().min(1, "Il secin."),
    district: z.string().min(1, "Ilce secin."),
    professionId: z.string().min(1, "Meslek secin."),
    billingAccountType: z.enum(["INDIVIDUAL", "CORPORATE"]),
    billingTcKimlik: optionalTrimmedString(),
    billingCompanyTitle: optionalTrimmedString(),
    billingTaxOffice: optionalTrimmedString(),
    billingVkn: optionalTrimmedString(),
    billingAddressLine: z.string().min(5, "Fatura adresi (sokak, bina, daire) en az 5 karakter olmalıdır."),
    billingPostalCode: optionalTrimmedString(),
    documents: z
      .object({
        diploma: optionalMemberDocumentUrl(),
        engineeringServiceCertificate: optionalMemberDocumentUrl(),
        taxCertificate: optionalMemberDocumentUrl(),
      })
      .optional()
      .default({}),
    newAdEmailOptIn: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const postal = data.billingPostalCode?.trim();
    if (postal && (postal.length < 4 || postal.length > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Posta kodu 4–10 karakter olmalıdır.",
        path: ["billingPostalCode"],
      });
    }
    if (data.billingAccountType === "INDIVIDUAL") {
      const tc = data.billingTcKimlik ? digitsOnly(data.billingTcKimlik) : "";
      if (!isValidTcKimlik(tc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Geçerli bir TC Kimlik Numarası girin (11 hane).",
          path: ["billingTcKimlik"],
        });
      }
    } else {
      const title = data.billingCompanyTitle?.trim() ?? "";
      if (title.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kurumsal ünvan zorunludur.",
          path: ["billingCompanyTitle"],
        });
      }
      const taxOff = data.billingTaxOffice?.trim() ?? "";
      if (taxOff.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vergi dairesi adı zorunludur.",
          path: ["billingTaxOffice"],
        });
      }
      const vkn = data.billingVkn ? digitsOnly(data.billingVkn) : "";
      if (!isValidVknFormat(vkn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vergi numarası 10 haneli olmalıdır.",
          path: ["billingVkn"],
        });
      }
    }
  });

function clearSignupEmailProofCookie(res: NextResponse, req: Request) {
  res.cookies.set(SIGNUP_EMAIL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
}

function clearSignupPhoneProofCookie(res: NextResponse, req: Request) {
  res.cookies.set(SIGNUP_PHONE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, "register");
  if (limited) return limited;

  try {
    const data = bodySchema.parse(await req.json());
    const flags = await getSignupVerificationFlags(prisma);

    if (flags.signupEmailVerificationRequired) {
      const proofCookie = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
      const proofOk = await verifySignupEmailProofToken(proofCookie, data.email);
      if (!proofOk) {
        return NextResponse.json(
          {
            error:
              "E-posta dogrulanmamis veya suresi dolmus. Once «E-postayi dogrula» ile kodu onaylayin.",
          },
          { status: 400 },
        );
      }
    }

    const phoneE164 = data.phone.trim() ? normalizePhoneInputToE164(data.phone) : null;
    if (flags.signupPhoneVerificationRequired) {
      if (!phoneE164) {
        return NextResponse.json(
          { error: "Geçerli bir telefon numarası gerekli." },
          { status: 400 },
        );
      }
      const phoneProofCookie = (await cookies()).get(SIGNUP_PHONE_COOKIE)?.value;
      const phoneProofOk = await verifySignupPhoneProofToken(phoneProofCookie, data.email, phoneE164);
      if (!phoneProofOk) {
        return NextResponse.json(
          {
            error:
              "Telefon doğrulanmamış veya süresi dolmuş. «Telefonu doğrula» ile kodu onaylayın veya yeni kod isteyin.",
          },
          { status: 400 },
        );
      }
    } else if (data.phone.trim() && !phoneE164) {
      return NextResponse.json(
        {
          error:
            "Geçerli bir telefon numarası girin (ör. +905551234567 veya seçtiğiniz ülkenin ulusal numarası).",
        },
        { status: 400 },
      );
    }

    const phoneForRegister = phoneE164;

    const professionOk = await prisma.profession.findUnique({
      where: { id: data.professionId },
      select: { id: true },
    });
    if (!professionOk) {
      return NextResponse.json({ error: "Gecersiz meslek secimi." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Bu e-posta adresi zaten kayıtlı. Giriş yapın veya başka bir e-posta ile yeniden deneyin.",
        },
        { status: 409 },
      );
    }

    const passwordHashed = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const n = await nextMemberNumber(tx);
      const created = await insertMemberUser(tx, {
        memberNumber: n,
        email: data.email,
        name: data.name,
        password: passwordHashed,
        profilePhotoUrl: data.profilePhotoUrl ?? null,
        newAdEmailOptIn: data.newAdEmailOptIn,
      });

      const phoneForProfile = phoneForRegister;

      const tcStore =
        data.billingAccountType === "INDIVIDUAL" ? digitsOnly(data.billingTcKimlik ?? "") : null;
      const vknStore =
        data.billingAccountType === "CORPORATE" ? digitsOnly(data.billingVkn ?? "") : null;

      const profile = await tx.memberProfile.upsert({
        where: { userId: created.id },
        update: {
          phone: phoneForProfile ?? null,
          province: data.province.trim(),
          district: data.district.trim(),
          professionId: data.professionId,
          billingAccountType: data.billingAccountType,
          billingTcKimlik: tcStore,
          billingCompanyTitle:
            data.billingAccountType === "CORPORATE" ? data.billingCompanyTitle?.trim() ?? null : null,
          billingTaxOffice:
            data.billingAccountType === "CORPORATE" ? data.billingTaxOffice?.trim() ?? null : null,
          billingVkn: vknStore,
          billingAddressLine: data.billingAddressLine.trim(),
          billingPostalCode: data.billingPostalCode?.trim() || null,
        },
        create: {
          userId: created.id,
          phone: phoneForProfile ?? null,
          province: data.province.trim(),
          district: data.district.trim(),
          professionId: data.professionId,
          billingAccountType: data.billingAccountType,
          billingTcKimlik: tcStore,
          billingCompanyTitle:
            data.billingAccountType === "CORPORATE" ? data.billingCompanyTitle?.trim() ?? null : null,
          billingTaxOffice:
            data.billingAccountType === "CORPORATE" ? data.billingTaxOffice?.trim() ?? null : null,
          billingVkn: vknStore,
          billingAddressLine: data.billingAddressLine.trim(),
          billingPostalCode: data.billingPostalCode?.trim() || null,
        },
      });

      const dip = data.documents.diploma?.trim();
      if (dip) {
        await tx.memberDocument.upsert({
          where: {
            memberId_type: { memberId: profile.id, type: "DIPLOMA" },
          },
          update: { fileUrl: dip },
          create: {
            memberId: profile.id,
            type: "DIPLOMA",
            fileUrl: dip,
          },
        });
      }
      const eng = data.documents.engineeringServiceCertificate?.trim();
      if (eng) {
        await tx.memberDocument.upsert({
          where: {
            memberId_type: {
              memberId: profile.id,
              type: "ENGINEERING_SERVICE_CERTIFICATE",
            },
          },
          update: { fileUrl: eng },
          create: {
            memberId: profile.id,
            type: "ENGINEERING_SERVICE_CERTIFICATE",
            fileUrl: eng,
          },
        });
      }
      const taxCert = data.documents.taxCertificate?.trim();
      if (taxCert) {
        await tx.memberDocument.upsert({
          where: {
            memberId_type: { memberId: profile.id, type: "TAX_CERTIFICATE" },
          },
          update: { fileUrl: taxCert },
          create: {
            memberId: profile.id,
            type: "TAX_CERTIFICATE",
            fileUrl: taxCert,
          },
        });
      }

      return created;
    });

    const res = NextResponse.json({
      ok: true,
      userId: user.id,
      memberNumber: user.memberNumber,
      pendingApproval: !user.isMemberApproved,
    });
    clearSignupEmailProofCookie(res, req);
    clearSignupPhoneProofCookie(res, req);
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[register]", error);
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Bu e-posta adresi veya üye numarası zaten kullanılıyor." },
        { status: 409 },
      );
    }
    const devMsg = error instanceof Error ? error.message : "Kayıt başarısız.";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "development" ? devMsg : "Kayıt başarısız.",
      },
      { status: 500 },
    );
  }
}
