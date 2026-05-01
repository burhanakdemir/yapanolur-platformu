-- Sponsor süre paketleri (4 / 7 / 10 / 15 / 30 gün) için ayrı TL fiyatları JSON.
ALTER TABLE "AdminSettings" ADD COLUMN "sponsorHeroPricingTryJson" TEXT NOT NULL DEFAULT '{}';

UPDATE "AdminSettings"
SET "sponsorHeroPricingTryJson" = jsonb_build_object(
  '4', "sponsorHeroFeeAmountTry",
  '7', "sponsorHeroFeeAmountTry",
  '10', "sponsorHeroFeeAmountTry",
  '15', "sponsorHeroFeeAmountTry",
  '30', "sponsorHeroFeeAmountTry"
)::text;
