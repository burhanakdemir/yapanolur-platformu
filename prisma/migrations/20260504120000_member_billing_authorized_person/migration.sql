-- Kurumsal üyelik: yetkili ad/soyad (User.name = şirket ünvanı)
ALTER TABLE "MemberProfile" ADD COLUMN "billingAuthorizedGivenName" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingAuthorizedFamilyName" TEXT;
