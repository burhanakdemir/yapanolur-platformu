-- Ana sayfa ust kayan serit: sponsor slaytlari veya yeni uyeler
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "homeHeroTickerMode" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "homeHeroNewMembersLimit" INTEGER NOT NULL DEFAULT 24;
