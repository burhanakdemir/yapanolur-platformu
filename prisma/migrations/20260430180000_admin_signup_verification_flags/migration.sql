-- Üye kaydı: e-posta / telefon OTP zorunluluğu (varsayılan açık; demo için panelden kapatılabilir).
ALTER TABLE "AdminSettings" ADD COLUMN "signupEmailVerificationRequired" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdminSettings" ADD COLUMN "signupPhoneVerificationRequired" BOOLEAN NOT NULL DEFAULT true;
