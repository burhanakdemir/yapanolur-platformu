-- Üye kaydında otomatik onay (süper yönetici ayarı). Varsayılan: manuel inceleme (false).
ALTER TABLE "AdminSettings" ADD COLUMN "memberSignupAutoApprove" BOOLEAN NOT NULL DEFAULT false;
