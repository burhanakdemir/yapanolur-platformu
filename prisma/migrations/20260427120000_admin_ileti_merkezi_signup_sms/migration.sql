-- AlterTable
ALTER TABLE "AdminSettings" ADD COLUMN     "signupIletiMerkeziApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signupIletiMerkeziApiSecret" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signupIletiMerkeziEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signupIletiMerkeziSender" TEXT NOT NULL DEFAULT '';
