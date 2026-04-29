-- Yeni ilan onayı sonrası otomatik e-posta / webhook yönetimi
ALTER TABLE "AdminSettings" ADD COLUMN "newAdEmailAutoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminSettings" ADD COLUMN "newAdEmailFromAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "newAdEmailWebhookEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminSettings" ADD COLUMN "newAdEmailWebhookUrlsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AdminSettings" ADD COLUMN "newAdEmailWebhookSecret" TEXT NOT NULL DEFAULT '';
