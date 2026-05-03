import { createHmac } from "node:crypto";
import { logIletiMerkeziApiFailure, logIletiMerkeziSuccessDebug } from "@/lib/iletMerkeziSafeLog";

/** Resmi JSON endpoint — yardım: iletimerkezi.com JSON SMS API */
const ILETI_MERKEZI_SEND_SMS_JSON_URL = "https://api.iletimerkezi.com/v1/send-sms/json";

/**
 * Laravel macellan/ileti-merkezi ile uyumlu: hash_hmac('sha256', apiKey, apiSecret)
 * → HMAC-SHA256(anahtar=apiSecret, veri=apiKey) hex.
 */
export function iletiMerkeziAuthenticationHash(apiKey: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(apiKey, "utf8").digest("hex");
}

/** E.164 → İleti Merkezi’nin beklediği rakam dizisi (örn. 905551234567). */
function phoneDigitsForIletiMerkezi(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

/**
 * macellan/ileti-merkezi ile aynı: `d/m/Y H:i`, anında gönderim için şu an (TR saati).
 * İstekte bu alan yoksa bazı hesaplarda JSON API kabul etmeyebilir.
 */
function iletiMerkeziSendDateTimeNow(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

type IletiJsonResponse = {
  response?: {
    status?: {
      code?: number | string;
      message?: string;
    };
  };
  status?: {
    code?: number | string;
    message?: string;
  };
};

function getIletiStatus(parsed: IletiJsonResponse): { code?: number | string; message?: string } | undefined {
  return parsed.response?.status ?? parsed.status;
}

function isIletiSuccess(parsed: IletiJsonResponse): boolean {
  const st = getIletiStatus(parsed);
  const c = st?.code;
  if (c === undefined || c === null) return false;
  return String(c) === "200" || c === 200;
}

export async function sendIletiMerkeziSignupOtp(params: {
  apiKey: string;
  apiSecret: string;
  sender: string;
  phoneE164: string;
  messageText: string;
  timeoutMs: number;
}): Promise<void> {
  const key = params.apiKey.trim();
  const secret = params.apiSecret.trim();
  const sender = params.sender.trim();
  if (!key || !secret || !sender) {
    throw new Error("İleti Merkezi API anahtarı, gizli anahtar ve gönderici başlığı zorunludur.");
  }
  const number = phoneDigitsForIletiMerkezi(params.phoneE164);
  if (number.length < 10) {
    throw new Error("Geçersiz telefon numarası.");
  }
  const hash = iletiMerkeziAuthenticationHash(key, secret);
  const body = {
    request: {
      authentication: {
        key,
        hash,
      },
      order: {
        sender,
        sendDateTime: iletiMerkeziSendDateTimeNow(),
        iys: 0,
        message: {
          text: params.messageText,
          receipents: {
            number: [number],
          },
        },
      },
    },
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), params.timeoutMs);
  try {
    const res = await fetch(ILETI_MERKEZI_SEND_SMS_JSON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    let parsed: IletiJsonResponse = {};
    try {
      parsed = JSON.parse(text) as IletiJsonResponse;
    } catch {
      /* yoksay */
    }
    if (!res.ok) {
      const st = getIletiStatus(parsed);
      const apiMsg = st?.message;
      logIletiMerkeziApiFailure({
        apiKey: key,
        httpStatus: res.status,
        bodySnippet: text,
        iletiCode: st?.code,
        iletiMessagePreview: typeof apiMsg === "string" ? apiMsg : undefined,
      });
      throw new Error(
        apiMsg && typeof apiMsg === "string"
          ? "SMS gönderilemedi. İleti Merkezi yanıtı: " + apiMsg
          : "SMS gönderilemedi. İleti Merkezi yanıtını kontrol edin.",
      );
    }
    if (!isIletiSuccess(parsed)) {
      const st = getIletiStatus(parsed);
      const apiMsg = st?.message;
      const code = st?.code;
      logIletiMerkeziApiFailure({
        apiKey: key,
        httpStatus: res.status,
        bodySnippet: text,
        iletiCode: code,
        iletiMessagePreview: typeof apiMsg === "string" ? apiMsg : undefined,
      });
      throw new Error(
        apiMsg && typeof apiMsg === "string"
          ? "SMS gönderilemedi: " + apiMsg
          : "SMS gönderilemedi (İleti Merkezi işlem kodu: " + String(code ?? "bilinmiyor") + ").",
      );
    }
    logIletiMerkeziSuccessDebug(res.status, key);
  } finally {
    clearTimeout(timer);
  }
}
