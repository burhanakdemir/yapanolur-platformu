import type { MemberBillingAccountType } from "@/generated/prisma/client";

export type EInvoiceBuyerSnapshot = {
  email: string;
  name: string | null;
  memberNumber: number;
  billingAccountType: MemberBillingAccountType;
  billingTcKimlik: string | null;
  billingCompanyTitle: string | null;
  billingTaxOffice: string | null;
  billingVkn: string | null;
  billingAddressLine: string | null;
  billingPostalCode: string | null;
};

export type IssueCreditTopUpInput = {
  paymentOrderId: string;
  creditInvoiceRequestId: string;
  amountTry: number;
  buyer: EInvoiceBuyerSnapshot;
};

export type IssueCreditTopUpResult =
  | { ok: true; ettn: string; providerDocumentId: string; documentUrl?: string }
  | { ok: false; error: string };
