import { Prisma } from "@/generated/prisma/client";

const WELCOME_BONUS_REFERENCE_PREFIX = "WELCOME_BONUS";
const DEFAULT_WELCOME_BONUS_AMOUNT_TRY = 500;

type WelcomeBonusDbClient = {
  adminSettings: {
    findUnique(args: {
      where: { id: "singleton" };
      select: { welcomeBonusEnabled: true; welcomeBonusAmountTry: true };
    }): Promise<{ welcomeBonusEnabled: boolean; welcomeBonusAmountTry: number } | null>;
  };
  creditTransaction: {
    findFirst(args: {
      where: { userId: string; type: "ADJUSTMENT"; referenceId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        userId: string;
        type: "ADJUSTMENT";
        amountTry: number;
        description: string;
        referenceId: string;
      };
    }): Promise<{ id: string }>;
  };
  $queryRaw(query: Prisma.Sql): Promise<unknown>;
};

export function getWelcomeBonusReferenceId(userId: string): string {
  return `${WELCOME_BONUS_REFERENCE_PREFIX}:${userId}`;
}

/** Yeni uyeye tek seferlik hosgeldin bakiyesi yukler (idempotent). */
export async function grantWelcomeBonusIfEligible(db: WelcomeBonusDbClient, userId: string) {
  const settings = await db.adminSettings.findUnique({
    where: { id: "singleton" },
    select: { welcomeBonusEnabled: true, welcomeBonusAmountTry: true },
  });
  const enabled = settings?.welcomeBonusEnabled ?? true;
  const amountTry = settings?.welcomeBonusAmountTry ?? DEFAULT_WELCOME_BONUS_AMOUNT_TRY;
  if (!enabled || amountTry <= 0) {
    return { granted: false };
  }

  const referenceId = getWelcomeBonusReferenceId(userId);

  // PostgreSQL transaction lock: ayni user icin paralel isteklerde cift bonusu engeller.
  await db.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${referenceId}))`);

  const existing = await db.creditTransaction.findFirst({
    where: { userId, type: "ADJUSTMENT", referenceId },
    select: { id: true },
  });
  if (existing) {
    return { granted: false };
  }

  await db.creditTransaction.create({
    data: {
      userId,
      type: "ADJUSTMENT",
      amountTry,
      description: "Hosgeldin bonusu",
      referenceId,
    },
  });

  return { granted: true };
}
