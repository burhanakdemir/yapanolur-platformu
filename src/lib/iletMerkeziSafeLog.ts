import { fingerprintIletiApiKey } from "@/lib/iletMerkeziRedact";

const MAX_BODY_IN_PROD = 120;

type IletiApiFailure = {
  apiKey: string;
  httpStatus: number;
  bodySnippet: string;
  /** İleti JSON yanıt status.code (varsa) */
  iletiCode?: string | number;
  /** İleti JSON message kısası (güvenli) */
  iletiMessagePreview?: string;
};

/**
 * Üretimde yanıt gövdesini kısaltır; tam key/secret/hash asla yazılmaz.
 */
export function logIletiMerkeziApiFailure(params: IletiApiFailure): void {
  const isDev = process.env.NODE_ENV === "development";
  const keyFp = fingerprintIletiApiKey(params.apiKey);
  const base = {
    keyFingerprint: keyFp,
    httpStatus: params.httpStatus,
    iletiCode: params.iletiCode,
  };
  if (isDev) {
    console.error("[İleti Merkezi SMS] istek/yanıt", {
      ...base,
      messagePreview: params.iletiMessagePreview,
      bodyPreview: params.bodySnippet.slice(0, 500),
    });
  } else {
    console.error("[İleti Merkezi SMS] istek/yanıt", {
      ...base,
      messagePreview: params.iletiMessagePreview?.slice(0, 80),
      bodyLen: params.bodySnippet.length,
      bodyTail: params.bodySnippet.slice(-MAX_BODY_IN_PROD),
    });
  }
}

export function logIletiMerkeziSuccessDebug(httpStatus: number, apiKey: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[İleti Merkezi SMS] gonderim HTTP", httpStatus, "key=", fingerprintIletiApiKey(apiKey));
}
