import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";

const DEFAULT_IYZICO_SANDBOX = "https://sandbox-api.iyzipay.com";
const DEFAULT_IYZICO_LIVE = "https://api.iyzipay.com";

function trimOrEmpty(s: string | null | undefined): string {
  return s?.trim() ?? "";
}

/**
 * iyzico: AdminSettings, yoksa IYZICO_API_KEY / IYZICO_SECRET_KEY / IYZICO_BASE_URL
 */
export async function getResolvedIyzicoConfig(): Promise<{
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  appUrl: string;
  source: "database" | "environment" | "mixed";
}> {
  const s = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  const fromDbKey = trimOrEmpty(s?.iyzicoApiKey);
  const fromDbSecret = trimOrEmpty(s?.iyzicoSecretKey);
  const fromDbBase = trimOrEmpty(s?.iyzicoBaseUrl);
  const fromEnvKey = trimOrEmpty(process.env.IYZICO_API_KEY);
  const fromEnvSecret = trimOrEmpty(process.env.IYZICO_SECRET_KEY);
  const fromEnvBase = trimOrEmpty(process.env.IYZICO_BASE_URL);

  const apiKey = fromDbKey || fromEnvKey;
  const secretKey = fromDbSecret || fromEnvSecret;
  const baseUrl =
    fromDbBase ||
    fromEnvBase ||
    (process.env.NODE_ENV === "production" ? DEFAULT_IYZICO_LIVE : DEFAULT_IYZICO_SANDBOX);

  let source: "database" | "environment" | "mixed" = "environment";
  if (fromDbKey && fromDbSecret) source = "database";
  else if ((fromDbKey || fromDbSecret) && (fromEnvKey || fromEnvSecret)) source = "mixed";

  if (!apiKey || !secretKey) {
    throw new Error("Iyzico ayarlari eksik. Yonetici paneli > Odeme saglayicilari veya IYZICO_API_KEY / IYZICO_SECRET_KEY.");
  }
  return {
    apiKey,
    secretKey,
    baseUrl,
    appUrl: getAppUrl(),
    source,
  };
}

/**
 * PayTR: AdminSettings, yoksa PAYTR_MERCHANT_ID / KEY / SALT
 */
export async function getResolvedPaytrConfig(): Promise<{
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
  appUrl: string;
  source: "database" | "environment" | "mixed";
}> {
  const s = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  const fromDbId = trimOrEmpty(s?.paytrMerchantId);
  const fromDbKey = trimOrEmpty(s?.paytrMerchantKey);
  const fromDbSalt = trimOrEmpty(s?.paytrMerchantSalt);
  const fromEnvId = trimOrEmpty(process.env.PAYTR_MERCHANT_ID);
  const fromEnvKey = trimOrEmpty(process.env.PAYTR_MERCHANT_KEY);
  const fromEnvSalt = trimOrEmpty(process.env.PAYTR_MERCHANT_SALT);

  const merchantId = fromDbId || fromEnvId;
  const merchantKey = fromDbKey || fromEnvKey;
  const merchantSalt = fromDbSalt || fromEnvSalt;
  const testMode = s?.paytrTestMode === true;

  let source: "database" | "environment" | "mixed" = "environment";
  if (fromDbId && fromDbKey && fromDbSalt) source = "database";
  else if ((fromDbId || fromDbKey || fromDbSalt) && (fromEnvId || fromEnvKey || fromEnvSalt)) {
    source = "mixed";
  }

  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error(
      "PayTR ayarlari eksik. Yonetici paneli > Odeme saglayicilari veya PAYTR_MERCHANT_ID / MERCHANT_KEY / MERCHANT_SALT.",
    );
  }
  return { merchantId, merchantKey, merchantSalt, testMode, appUrl: getAppUrl(), source };
}

export const IYZICO_BASE_URL_CHOICES = [
  { value: "https://sandbox-api.iyzipay.com", label: "iyzico Test (Sandbox)" },
  { value: "https://api.iyzipay.com", label: "iyzico Canli" },
] as const;
