-- CreateTable
CREATE TABLE "AssistantFaq" (
    "id" TEXT NOT NULL,
    "questionTr" TEXT NOT NULL,
    "answerTr" TEXT NOT NULL,
    "questionEn" TEXT,
    "answerEn" TEXT,
    "keywords" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantFaq_isActive_sortOrder_idx" ON "AssistantFaq"("isActive", "sortOrder");
