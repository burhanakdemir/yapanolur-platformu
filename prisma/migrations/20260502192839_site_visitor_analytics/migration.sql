-- CreateTable
CREATE TABLE "SiteVisitDaily" (
    "dayYmd" TEXT NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL,

    CONSTRAINT "SiteVisitDaily_pkey" PRIMARY KEY ("dayYmd")
);

-- CreateTable
CREATE TABLE "SiteVisitorDayDedup" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "dayYmd" TEXT NOT NULL,

    CONSTRAINT "SiteVisitorDayDedup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisitorPresence" (
    "visitorKey" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisitorPresence_pkey" PRIMARY KEY ("visitorKey")
);

-- CreateIndex
CREATE INDEX "SiteVisitorDayDedup_dayYmd_idx" ON "SiteVisitorDayDedup"("dayYmd");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisitorDayDedup_visitorKey_dayYmd_key" ON "SiteVisitorDayDedup"("visitorKey", "dayYmd");

-- CreateIndex
CREATE INDEX "SiteVisitorPresence_lastSeenAt_idx" ON "SiteVisitorPresence"("lastSeenAt");
