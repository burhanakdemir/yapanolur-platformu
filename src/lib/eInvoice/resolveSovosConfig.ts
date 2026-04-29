import { prisma } from "@/lib/prisma";

export type ResolvedSovosEInvoiceConfig = {
  mode: "mock" | "sovos";
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Öncelik: AdminSettings (süper yönetici paneli), yedek: ortam değişkenleri.
 * Hassas değerleri loglamayın.
 */
export async function getResolvedSovosEInvoiceConfig(): Promise<ResolvedSovosEInvoiceConfig> {
  const s = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });

  const dbMode = s?.eInvoiceMode?.trim().toLowerCase();
  const modeFromDb = dbMode === "sovos" || dbMode === "mock" ? dbMode : null;
  const envMode = (process.env.EINVOICE_MODE || "mock").trim().toLowerCase();
  const modeRaw = modeFromDb ?? (envMode === "sovos" ? "sovos" : "mock");
  const mode: "mock" | "sovos" = modeRaw === "sovos" ? "sovos" : "mock";

  const baseUrl = (s?.sovosApiBaseUrl?.trim() || process.env.SOVOS_API_BASE_URL?.trim() || "").replace(/\/$/, "");
  const apiKey = s?.sovosApiKey?.trim() || process.env.SOVOS_API_KEY?.trim() || "";
  const apiSecret = s?.sovosApiSecret?.trim() || process.env.SOVOS_API_SECRET?.trim() || "";

  return { mode, baseUrl, apiKey, apiSecret };
}
