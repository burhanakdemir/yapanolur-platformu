import type { PrismaClient } from "@/generated/prisma/client";

export type RegisterConflictKind = "email" | "phone" | "both";

export function registerConflictKind(
  emailTaken: boolean,
  phoneTaken: boolean,
): RegisterConflictKind | null {
  if (emailTaken && phoneTaken) return "both";
  if (emailTaken) return "email";
  if (phoneTaken) return "phone";
  return null;
}

export function registerConflictKindFromApiCode(code: unknown): RegisterConflictKind | null {
  if (code === "email_taken") return "email";
  if (code === "phone_taken") return "phone";
  if (code === "both_taken") return "both";
  return null;
}

/** 409 yanıtından çakışma türü; `code` veya `emailTaken`/`phoneTaken` bayraklarından. */
export function parseRegisterConflictResponse(
  status: number,
  data: Record<string, unknown>,
): RegisterConflictKind | null {
  if (status !== 409) return null;
  return (
    registerConflictKindFromApiCode(data.code) ??
    registerConflictKind(data.emailTaken === true, data.phoneTaken === true)
  );
}

export function registerConflictMessage(kind: RegisterConflictKind): string {
  switch (kind) {
    case "email":
      return "Bu e-posta adresi ile daha önce kayıt yapılmış";
    case "phone":
      return "Bu Telefon Numarası ile daha önce kayıt yapılmış";
    case "both":
      return "Bu e-posta adresi ve Telefon Numarası ile daha önce kayıt yapılmış";
  }
}

export async function isEmailRegistered(
  prisma: Pick<PrismaClient, "user">,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const row = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  return Boolean(row);
}

/** `MemberProfile.phone` E.164 olarak saklanır; başka üyede aynı numara var mı. */
export async function isPhoneRegistered(
  prisma: Pick<PrismaClient, "memberProfile">,
  phoneE164: string,
  opts?: { excludeEmail?: string },
): Promise<boolean> {
  const phone = phoneE164.trim();
  if (!phone) return false;
  const exclude = opts?.excludeEmail?.trim().toLowerCase();
  const row = await prisma.memberProfile.findFirst({
    where: {
      phone,
      ...(exclude
        ? {
            user: {
              email: { not: exclude },
            },
          }
        : {}),
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function checkRegisterAvailability(
  prisma: Pick<PrismaClient, "user" | "memberProfile">,
  params: { email?: string; phoneE164?: string | null },
): Promise<{ emailTaken: boolean; phoneTaken: boolean; conflict: RegisterConflictKind | null }> {
  const email = params.email?.trim().toLowerCase() ?? "";
  const phone = params.phoneE164?.trim() ?? "";
  const emailTaken = email ? await isEmailRegistered(prisma, email) : false;
  const phoneTaken = phone
    ? await isPhoneRegistered(prisma, phone, email ? { excludeEmail: email } : undefined)
    : false;
  return {
    emailTaken,
    phoneTaken,
    conflict: registerConflictKind(emailTaken, phoneTaken),
  };
}
