import type { MemberProfile, User } from "@/generated/prisma/client";
import type { EInvoiceBuyerSnapshot } from "./types";

type Row = Pick<User, "email" | "name" | "memberNumber"> & {
  memberProfile: Pick<
    MemberProfile,
    | "billingAccountType"
    | "billingTcKimlik"
    | "billingCompanyTitle"
    | "billingTaxOffice"
    | "billingVkn"
    | "billingAddressLine"
    | "billingPostalCode"
  > | null;
};

export function memberToEInvoiceBuyer(row: Row): EInvoiceBuyerSnapshot {
  const mp = row.memberProfile;
  return {
    email: row.email,
    name: row.name,
    memberNumber: row.memberNumber,
    billingAccountType: mp?.billingAccountType ?? "INDIVIDUAL",
    billingTcKimlik: mp?.billingTcKimlik ?? null,
    billingCompanyTitle: mp?.billingCompanyTitle ?? null,
    billingTaxOffice: mp?.billingTaxOffice ?? null,
    billingVkn: mp?.billingVkn ?? null,
    billingAddressLine: mp?.billingAddressLine ?? null,
    billingPostalCode: mp?.billingPostalCode ?? null,
  };
}
