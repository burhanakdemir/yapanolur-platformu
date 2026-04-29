import { randomUUID } from "node:crypto";
import type { ResolvedSovosEInvoiceConfig } from "./resolveSovosConfig";
import type { IssueCreditTopUpInput, IssueCreditTopUpResult } from "./types";

/**
 * Sovos e-Fatura / e-Arşiv — `cfg.mode=mock` simülasyonu.
 * `cfg.mode=sovos`: gerçek REST çağrısı için yer tutucu (Sovos dokümantasyonu + paneldeki URL/anahtarlar).
 *
 * Hassas alanları loglamayın.
 */
export async function issueSovosCreditTopUpInvoice(
  input: IssueCreditTopUpInput,
  cfg: ResolvedSovosEInvoiceConfig,
): Promise<IssueCreditTopUpResult> {
  if (cfg.mode === "sovos") {
    if (!cfg.baseUrl) {
      return {
        ok: false,
        error:
          "Sovos API taban adresi tanimli degil. Süper yönetici Ödeme sayfasindan veya SOVOS_API_BASE_URL ile tanimlayin.",
      };
    }
    // TODO: OAuth veya API key ile token; Sovos fatura gönderim endpoint'i — entegratör sözleşmesine göre.
    void input;
    void cfg.apiKey;
    void cfg.apiSecret;
    return {
      ok: false,
      error: "Sovos canli API henuz baglanmadi (stub). mock modunda test edin.",
    };
  }

  // mock
  const ettn = randomUUID().toUpperCase();
  const docId = `MOCK-${input.paymentOrderId.slice(0, 8)}-${Date.now()}`;
  return {
    ok: true,
    ettn,
    providerDocumentId: docId,
    documentUrl: undefined,
  };
}
