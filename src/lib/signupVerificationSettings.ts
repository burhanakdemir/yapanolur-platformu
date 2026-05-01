import type { PrismaClient } from "@/generated/prisma/client";

export type SignupVerificationFlags = {
  signupEmailVerificationRequired: boolean;
  signupPhoneVerificationRequired: boolean;
};

/**
 * AdminSettings singleton — alan yoksa (eski DB) güvenli varsayılan: ikisi de açık.
 */
export async function getSignupVerificationFlags(
  prisma: Pick<PrismaClient, "adminSettings">,
): Promise<SignupVerificationFlags> {
  const row = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: {
      signupEmailVerificationRequired: true,
      signupPhoneVerificationRequired: true,
    },
  });
  return {
    signupEmailVerificationRequired: row?.signupEmailVerificationRequired ?? true,
    signupPhoneVerificationRequired: row?.signupPhoneVerificationRequired ?? true,
  };
}
