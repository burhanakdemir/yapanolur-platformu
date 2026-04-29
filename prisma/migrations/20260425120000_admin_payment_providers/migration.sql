-- iyzico & PayTR credentials managed from admin (fallback: env)
ALTER TABLE "AdminSettings" ADD COLUMN "iyzicoApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "iyzicoSecretKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "iyzicoBaseUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "paytrMerchantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "paytrMerchantKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "paytrMerchantSalt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "paytrTestMode" BOOLEAN NOT NULL DEFAULT false;
