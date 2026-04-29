-- Genel İleti Merkezi JSON SMS (panel + ILETI_MERKEZI_* env yedek)
ALTER TABLE "AdminSettings" ADD COLUMN     "iletiMerkeziUser" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "iletiMerkeziPass" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "iletiMerkeziSender" TEXT NOT NULL DEFAULT '';
