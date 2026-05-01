-- AlterTable
ALTER TABLE "AdminSettings" ADD COLUMN     "sponsorHeroFeeAmountTry" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sponsorHeroPeriodDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "HomeHeroSlide" ADD COLUMN     "sponsorUserId" TEXT;

-- CreateIndex
CREATE INDEX "HomeHeroSlide_sponsorUserId_idx" ON "HomeHeroSlide"("sponsorUserId");

-- AddForeignKey
ALTER TABLE "HomeHeroSlide" ADD CONSTRAINT "HomeHeroSlide_sponsorUserId_fkey" FOREIGN KEY ("sponsorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
