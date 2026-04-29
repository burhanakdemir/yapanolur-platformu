-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberDocumentType" AS ENUM ('DIPLOMA', 'ENGINEERING_SERVICE_CERTIFICATE', 'TAX_CERTIFICATE');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('TOP_UP', 'BID_FEE', 'REFUND', 'AD_FEE', 'ADJUSTMENT', 'DETAIL_VIEW_FEE', 'BID_ACCESS_FEE', 'MEMBER_CONTACT_FEE', 'MEMBER_COMMENT_FEE', 'MEMBER_COMMENT_REPLY_FEE');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('IYZICO', 'PAYTR', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "MemberPeerVoteType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profilePhotoUrl" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "isMemberApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberComment" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyBody" TEXT,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "MemberComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPeerVote" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" "MemberPeerVoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPeerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberContactAccess" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberContactAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "province" TEXT,
    "district" TEXT,
    "professionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberDocument" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "MemberDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "listingNumber" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startingPriceTry" INTEGER NOT NULL DEFAULT 1000,
    "auctionEndsAt" TIMESTAMP(3),
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "blockNo" TEXT,
    "parcelNo" TEXT,
    "showcaseUntil" TIMESTAMP(3),
    "status" "AdStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPhoto" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amountTry" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amountTry" INTEGER NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdUserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "detailPaidAt" TIMESTAMP(3),
    "bidAccessPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdUserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bidFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bidFeeAmountTry" INTEGER NOT NULL DEFAULT 0,
    "detailViewFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailViewFeeAmountTry" INTEGER NOT NULL DEFAULT 0,
    "bidAccessFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bidAccessFeeAmountTry" INTEGER NOT NULL DEFAULT 0,
    "memberContactFeeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "memberContactFeeAmountTry" INTEGER NOT NULL DEFAULT 50,
    "memberCommentFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "memberCommentFeeAmountTry" INTEGER NOT NULL DEFAULT 0,
    "showcaseFeeAmountTry" INTEGER NOT NULL DEFAULT 250,
    "showcaseDailyPricingJson" TEXT NOT NULL DEFAULT '{}',
    "homeHeroTitleTr" TEXT NOT NULL DEFAULT 'Kullanici veya ilan veren olarak katilin',
    "homeHeroSubtitleTr" TEXT NOT NULL DEFAULT 'Kullanici olarak teklif verin, ilan yayinlayin ve ilanlarinizi gercek zamanli yonetin.',
    "homeHeroTitleEn" TEXT NOT NULL DEFAULT 'Join as user or seller',
    "homeHeroSubtitleEn" TEXT NOT NULL DEFAULT 'Place bids as user, publish listings, and manage your listings in real-time.',
    "homeTaglineTr" TEXT NOT NULL DEFAULT 'Cok saticili ilan ve teklif platformu',
    "homeTaglineEn" TEXT NOT NULL DEFAULT 'Multivendor listing and bidding platform',
    "homePrimaryButtonTr" TEXT NOT NULL DEFAULT 'Kullanici ol',
    "homePrimaryButtonEn" TEXT NOT NULL DEFAULT 'Become a user',
    "homeSecondaryButtonTr" TEXT NOT NULL DEFAULT 'Satici ol',
    "homeSecondaryButtonEn" TEXT NOT NULL DEFAULT 'Become a merchant',
    "homeFooterContact" TEXT NOT NULL DEFAULT 'Contact: +90 850 000 00 00 | support@viserbid.local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "amountTry" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "providerPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_memberNumber_key" ON "User"("memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MemberComment_toUserId_createdAt_idx" ON "MemberComment"("toUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MemberComment_fromUserId_createdAt_idx" ON "MemberComment"("fromUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MemberPeerVote_toUserId_type_idx" ON "MemberPeerVote"("toUserId", "type");

-- CreateIndex
CREATE INDEX "MemberPeerVote_fromUserId_idx" ON "MemberPeerVote"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPeerVote_fromUserId_toUserId_key" ON "MemberPeerVote"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "MemberContactAccess_viewerUserId_idx" ON "MemberContactAccess"("viewerUserId");

-- CreateIndex
CREATE INDEX "MemberContactAccess_targetUserId_idx" ON "MemberContactAccess"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberContactAccess_viewerUserId_targetUserId_key" ON "MemberContactAccess"("viewerUserId", "targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE INDEX "Profession_sortOrder_name_idx" ON "Profession"("sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberDocument_memberId_type_key" ON "MemberDocument"("memberId", "type");

-- CreateIndex
CREATE INDEX "OtpChallenge_purpose_target_idx" ON "OtpChallenge"("purpose", "target");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_listingNumber_key" ON "Ad"("listingNumber");

-- CreateIndex
CREATE INDEX "Ad_categoryId_idx" ON "Ad"("categoryId");

-- CreateIndex
CREATE INDEX "Ad_city_province_district_neighborhood_idx" ON "Ad"("city", "province", "district", "neighborhood");

-- CreateIndex
CREATE INDEX "Ad_createdAt_idx" ON "Ad"("createdAt");

-- CreateIndex
CREATE INDEX "AdWatch_userId_createdAt_idx" ON "AdWatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdWatch_adId_createdAt_idx" ON "AdWatch"("adId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdWatch_userId_adId_key" ON "AdWatch"("userId", "adId");

-- CreateIndex
CREATE INDEX "Bid_adId_createdAt_idx" ON "Bid"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "Bid_bidderId_createdAt_idx" ON "Bid"("bidderId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_createdAt_idx" ON "CreditTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AdUserAccess_adId_idx" ON "AdUserAccess"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "AdUserAccess_userId_adId_key" ON "AdUserAccess"("userId", "adId");

-- CreateIndex
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "Category_parentId_createdAt_idx" ON "Category"("parentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_parentId_key" ON "Category"("name", "parentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberComment" ADD CONSTRAINT "MemberComment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComment" ADD CONSTRAINT "MemberComment_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPeerVote" ADD CONSTRAINT "MemberPeerVote_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPeerVote" ADD CONSTRAINT "MemberPeerVote_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContactAccess" ADD CONSTRAINT "MemberContactAccess_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberContactAccess" ADD CONSTRAINT "MemberContactAccess_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDocument" ADD CONSTRAINT "MemberDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdWatch" ADD CONSTRAINT "AdWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdWatch" ADD CONSTRAINT "AdWatch_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPhoto" ADD CONSTRAINT "AdPhoto_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdUserAccess" ADD CONSTRAINT "AdUserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdUserAccess" ADD CONSTRAINT "AdUserAccess_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
