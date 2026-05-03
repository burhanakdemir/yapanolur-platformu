import { createHash, randomInt } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getSignupOtpTtlMinutes } from "@/lib/signupOtpTtl";

function getOtpPepper(): string {
  const p = process.env.OTP_PEPPER?.trim();
  if (!p) {
    throw new Error(
      "OTP_PEPPER ortam degiskeni tanimlanmali. .env dosyasina rastgele bir deger ekleyin.",
    );
  }
  return p;
}

export const OTP_PURPOSE_SIGNUP_EMAIL = "signup_email";
export const OTP_PURPOSE_SIGNUP_PHONE = "signup_phone";

/** Kayıt e-posta OTP geçerlilik süresi (dakika); `SIGNUP_OTP_TTL_MINUTES` ile yapılandırılır. */
export const OTP_SIGNUP_EMAIL_TTL_MINUTES = getSignupOtpTtlMinutes();

export function generateSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(target: string, purpose: string, code: string): string {
  return createHash("sha256")
    .update(`${getOtpPepper()}:${purpose}:${target}:${code}`)
    .digest("hex");
}

const MAX_OTP_PER_HOUR = 8;

export async function assertOtpRateOk(
  prisma: PrismaClient,
  purpose: string,
  target: string,
): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const n = await prisma.otpChallenge.count({
    where: { purpose, target, createdAt: { gte: since } },
  });
  if (n >= MAX_OTP_PER_HOUR) {
    throw new Error("Cok fazla kod istegi. Bir saat sonra tekrar deneyin.");
  }
}

export async function saveOtpChallenge(
  prisma: PrismaClient,
  purpose: string,
  target: string,
  code: string,
  ttlMinutes = 15,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.otpChallenge.deleteMany({ where: { purpose, target } });
  await prisma.otpChallenge.create({
    data: {
      purpose,
      target,
      codeHash: hashOtp(target, purpose, code),
      expiresAt,
    },
  });
}

/** Dogruysa true ve kayit silinir; yanlisysa false (deneme sayisi artirilmaz - basit). */
export async function verifyAndConsumeOtp(
  prisma: PrismaClient,
  purpose: string,
  target: string,
  code: string,
): Promise<boolean> {
  const row = await prisma.otpChallenge.findFirst({
    where: { purpose, target, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return false;
  const ok = row.codeHash === hashOtp(target, purpose, code.trim());
  if (!ok) return false;
  await prisma.otpChallenge.deleteMany({ where: { purpose, target } });
  return true;
}
