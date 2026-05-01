-- Bekleyen sponsor paketi başvuruları + onay / red + iade
CREATE TYPE "SponsorHeroPurchaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "SponsorHeroPurchaseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "amountTryPaid" INTEGER NOT NULL,
    "status" "SponsorHeroPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "paymentCreditTxId" TEXT,
    "refundCreditTxId" TEXT,
    "homeHeroSlideId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorHeroPurchaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SponsorHeroPurchaseRequest_status_createdAt_idx" ON "SponsorHeroPurchaseRequest"("status", "createdAt");
CREATE INDEX "SponsorHeroPurchaseRequest_userId_status_idx" ON "SponsorHeroPurchaseRequest"("userId", "status");

ALTER TABLE "SponsorHeroPurchaseRequest" ADD CONSTRAINT "SponsorHeroPurchaseRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SponsorHeroPurchaseRequest" ADD CONSTRAINT "SponsorHeroPurchaseRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
