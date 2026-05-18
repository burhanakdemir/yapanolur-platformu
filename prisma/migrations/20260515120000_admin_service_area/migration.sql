-- Hizmet bolgesi: kayit, arama ve ilan konumlari (Site Ayarlari)
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "serviceAreaProvincesJson" TEXT NOT NULL DEFAULT '["Antalya"]';
ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "serviceAreaDistrictsJson" TEXT NOT NULL DEFAULT '{}';
