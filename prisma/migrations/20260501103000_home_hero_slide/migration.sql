-- Ana sayfa hero carousel slaytları (yönetici + sponsor)

CREATE TYPE "HomeHeroSlideLang" AS ENUM ('tr', 'en');

CREATE TABLE "HomeHeroSlide" (
    "id" TEXT NOT NULL,
    "lang" "HomeHeroSlideLang" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "ctaUrl" TEXT,
    "ctaLabel" TEXT,
    "isSponsor" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeHeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeHeroSlide_lang_active_sortOrder_idx" ON "HomeHeroSlide"("lang", "active", "sortOrder");
