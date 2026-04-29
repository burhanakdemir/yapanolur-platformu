-- AlterTable
ALTER TABLE "AdminSettings" ADD COLUMN     "signupSmsAuthHeaderName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signupSmsAuthHeaderValue" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signupSmsHttpBodyTemplate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signupSmsHttpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signupSmsHttpHeadersJson" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "signupSmsHttpMethod" TEXT NOT NULL DEFAULT 'POST',
ADD COLUMN     "signupSmsHttpTimeoutMs" INTEGER NOT NULL DEFAULT 15000,
ADD COLUMN     "signupSmsHttpUrl" TEXT NOT NULL DEFAULT '';
