-- Kurumsal kayıtta fatura ile iletişim bilgisinin ayrı tutulması (isteğe bağlı).
ALTER TABLE "MemberProfile" ADD COLUMN "billingContactSameAsInvoice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MemberProfile" ADD COLUMN "billingContactTcKimlik" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingContactAddressLine" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "billingContactPostalCode" TEXT;
