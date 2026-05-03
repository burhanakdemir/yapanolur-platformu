/*
  Warnings:

  - You are about to drop the column `completedAt` on the `MemberWorkExperience` table. All the data in the column will be lost.
  - You are about to drop the column `listingProcedures` on the `MemberWorkExperience` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MemberWorkExperience_userId_completedAt_idx";

-- AlterTable
ALTER TABLE "MemberWorkExperience" DROP COLUMN "completedAt",
DROP COLUMN "listingProcedures",
ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "durationMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "durationYears" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MemberWorkExperience_userId_createdAt_idx" ON "MemberWorkExperience"("userId", "createdAt" DESC);
