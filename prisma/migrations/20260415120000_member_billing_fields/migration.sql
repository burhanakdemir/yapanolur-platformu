-- CreateEnum
CREATE TYPE "MemberBillingAccountType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- AlterTable
ALTER TABLE "MemberProfile" ADD COLUMN "billingAccountType" "MemberBillingAccountType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "MemberProfile" ADD COLUMN "billingTcKimlik" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingCompanyTitle" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingTaxOffice" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingVkn" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingAddressLine" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingPostalCode" TEXT;
