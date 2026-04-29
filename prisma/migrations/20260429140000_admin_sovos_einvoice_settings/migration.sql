-- AlterTable
ALTER TABLE "AdminSettings" ADD COLUMN "eInvoiceMode" TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE "AdminSettings" ADD COLUMN "sovosApiBaseUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "sovosApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "sovosApiSecret" TEXT NOT NULL DEFAULT '';
