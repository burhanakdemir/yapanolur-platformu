-- CreateTable
CREATE TABLE "MemberWorkExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "blockParcel" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl1" TEXT,
    "imageUrl2" TEXT,
    "imageUrl3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberWorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberWorkExperience_userId_completedAt_idx" ON "MemberWorkExperience"("userId", "completedAt" DESC);

-- AddForeignKey
ALTER TABLE "MemberWorkExperience" ADD CONSTRAINT "MemberWorkExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
