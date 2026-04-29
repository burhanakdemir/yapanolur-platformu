-- CreateEnum
CREATE TYPE "CreditInvoiceRequestStatus" AS ENUM ('PENDING_APPROVAL', 'ISSUED', 'FAILED');

-- CreateTable
CREATE TABLE "CreditInvoiceRequest" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountTry" INTEGER NOT NULL,
    "status" "CreditInvoiceRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "adminNote" TEXT,
    "approvedByUserId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'SOVOS',
    "providerDocumentId" TEXT,
    "ettn" TEXT,
    "documentUrl" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditInvoiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditInvoiceRequest_paymentOrderId_key" ON "CreditInvoiceRequest"("paymentOrderId");

-- CreateIndex
CREATE INDEX "CreditInvoiceRequest_status_createdAt_idx" ON "CreditInvoiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreditInvoiceRequest_userId_createdAt_idx" ON "CreditInvoiceRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditInvoiceRequest" ADD CONSTRAINT "CreditInvoiceRequest_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditInvoiceRequest" ADD CONSTRAINT "CreditInvoiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditInvoiceRequest" ADD CONSTRAINT "CreditInvoiceRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
