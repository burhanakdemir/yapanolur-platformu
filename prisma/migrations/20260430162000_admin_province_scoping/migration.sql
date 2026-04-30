-- Admin il bazli yetkilendirme
ALTER TABLE "User"
ADD COLUMN "hasAllProvinces" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SupportConversation"
ADD COLUMN "province" TEXT;

CREATE TABLE "AdminProvinceAccess" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminProvinceAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminProvinceAccess_adminUserId_province_key"
ON "AdminProvinceAccess"("adminUserId", "province");

CREATE INDEX "AdminProvinceAccess_province_idx" ON "AdminProvinceAccess"("province");
CREATE INDEX "AdminProvinceAccess_adminUserId_idx" ON "AdminProvinceAccess"("adminUserId");

CREATE INDEX "SupportConversation_province_status_updatedAt_idx"
ON "SupportConversation"("province", "status", "updatedAt");

ALTER TABLE "AdminProvinceAccess"
ADD CONSTRAINT "AdminProvinceAccess_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
