-- Yönetici panelinden SMTP; boş alanlarda .env SMTP_* yedek kalır
ALTER TABLE "AdminSettings" ADD COLUMN "smtpHost" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "AdminSettings" ADD COLUMN "smtpUser" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "smtpPass" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AdminSettings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false;

-- Mevcut kayıttaki gönderen: test / ilk kurulum (sonradan panelden değiştirilebilir)
UPDATE "AdminSettings"
SET "newAdEmailFromAddress" = 'hmjturk@gmail.com'
WHERE "id" = 'singleton' AND (COALESCE(TRIM("newAdEmailFromAddress"), '') = '');
