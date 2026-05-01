import { getSafeMetadataBase } from "@/lib/appUrl";

/** KVKK / iletişim sayfalarında gösterilir; `.env` ile doldurulabilir. */
export type PublicLegalEntity = {
  entityName: string | null;
  address: string | null;
  mersis: string | null;
  kvkkEmail: string | null;
};

export function getPublicLegalEntity(): PublicLegalEntity {
  return {
    entityName: process.env.LEGAL_ENTITY_NAME?.trim() || null,
    address: process.env.LEGAL_ENTITY_ADDRESS?.trim() || null,
    mersis: process.env.MERSIS_NUMBER?.trim() || null,
    kvkkEmail: process.env.KVKK_CONTACT_EMAIL?.trim() || null,
  };
}

/** Kanonik site ana makinesi (APP_URL); metadata tabanından. */
export function getCanonicalHostname(): string {
  try {
    const host = getSafeMetadataBase().hostname;
    return host.replace(/^www\./i, "") || "yapanolur.com";
  } catch {
    return "yapanolur.com";
  }
}

export function hasLegalEntityEnvDetails(le: PublicLegalEntity): boolean {
  return Boolean(le.entityName || le.address || le.mersis || le.kvkkEmail);
}
