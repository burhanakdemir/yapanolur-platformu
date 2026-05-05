-- Yeni uye hosgeldin bakiyesi ayarlari.
ALTER TABLE "AdminSettings"
ADD COLUMN "welcomeBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "welcomeBonusAmountTry" INTEGER NOT NULL DEFAULT 500;
