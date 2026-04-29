-- AlterTable
ALTER TABLE "Ad" ADD COLUMN     "professionId" TEXT;

-- CreateIndex
CREATE INDEX "Ad_professionId_idx" ON "Ad"("professionId");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
