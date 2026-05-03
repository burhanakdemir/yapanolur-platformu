-- AlterTable
ALTER TABLE "MemberWorkExperience" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "listingProcedures" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "professionId" TEXT;

-- CreateIndex
CREATE INDEX "MemberWorkExperience_professionId_idx" ON "MemberWorkExperience"("professionId");

-- CreateIndex
CREATE INDEX "MemberWorkExperience_categoryId_idx" ON "MemberWorkExperience"("categoryId");

-- AddForeignKey
ALTER TABLE "MemberWorkExperience" ADD CONSTRAINT "MemberWorkExperience_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberWorkExperience" ADD CONSTRAINT "MemberWorkExperience_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
