import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

/**
 * Bazi ortamlarda uretilen Prisma istemcisi `User.memberNumber` alanini
 * create() icinde kabul etmeyebilir. INSERT ham SQL ile yapilir; tabloda
 * `memberNumber` sutunu olmalidir (migration uygulanmis olmali).
 */
export async function insertMemberUser(
  tx: Prisma.TransactionClient,
  input: {
    memberNumber: number;
    email: string;
    name: string;
    password: string;
    profilePhotoUrl: string | null;
    newAdEmailOptIn: boolean;
  },
): Promise<{ id: string; memberNumber: number; isMemberApproved: boolean }> {
  const id = randomUUID();
  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO "User" (
        "id",
        "memberNumber",
        "email",
        "name",
        "profilePhotoUrl",
        "password",
        "role",
        "isMemberApproved",
        "newAdEmailOptIn",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.memberNumber},
        ${input.email},
        ${input.name},
        ${input.profilePhotoUrl},
        ${input.password},
        'MEMBER',
        false,
        ${input.newAdEmailOptIn},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `,
  );
  return { id, memberNumber: input.memberNumber, isMemberApproved: false };
}
