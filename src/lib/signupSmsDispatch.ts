import type { PrismaClient } from "@/generated/prisma/client";
import { sendIletiMerkeziSignupOtp } from "@/lib/iletMerkeziSignupSms";
import { getSignupOtpTtlMinutes } from "@/lib/signupOtpTtl";

function formatOtpTtlSmsTr(minutes: number): string {
  const m = Math.floor(Math.min(60, Math.max(1, minutes)));
  return m <= 1 ? "1 dk" : `${m} dk`;
}

async function fetchAdminSettingsRow(prisma: PrismaClient) {
  /** Kayıt SMS ayarları okunurken satır yoksa oluştur (findUnique null → tüm kanallar kapalı görünürdü). */
  return prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

async function getSignupSmsAdminConfig(prisma: PrismaClient) {
  return fetchAdminSettingsRow(prisma);
}

/**
 * Kayıt SMS paneli kaydedildiğinde çağrılır. Önbellek kaldırıldı; çoklu instance / taze ayar için
 * her gönderimde DB okunur. İsim geriye dönük uyumluluk için korunur.
 */
export function invalidateSignupSmsConfigCache() {
  /* no-op */
}

const DEFAULT_OTP_SMS_TEXT_TR = (code: string) =>
  `Üye kayıt doğrulama kodunuz: ${code} (${formatOtpTtlSmsTr(getSignupOtpTtlMinutes())} geçerli)`;

function applyTemplate(template: string, phoneE164: string, code: string, message: string): string {
  return template
    .replace(/\{\{phone\}\}/g, phoneE164)
    .replace(/\{\{code\}\}/g, code)
    .replace(/\{\{message\}\}/g, message);
}

/** GET URL için güvenli yer tutucu değişimi */
function applyUrlTemplate(urlTemplate: string, phoneE164: string, code: string, message: string): string {
  return urlTemplate
    .replace(/\{\{phone\}\}/g, encodeURIComponent(phoneE164))
    .replace(/\{\{code\}\}/g, encodeURIComponent(code))
    .replace(/\{\{message\}\}/g, encodeURIComponent(message));
}

async function sendTwilioSignupSms(phoneE164: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error("TWILIO_YOK");
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: phoneE164,
      From: from,
      Body: body,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[Twilio SMS hata]", res.status, t);
    throw new Error("SMS sağlayıcısı yanıt vermedi. Lütfen daha sonra tekrar deneyin.");
  }
}

async function sendHttpWebhookSms(
  prisma: PrismaClient,
  phoneE164: string,
  code: string,
  message: string,
): Promise<void> {
  const s = await getSignupSmsAdminConfig(prisma);
  if (!s) throw new Error("Sunucu yapılandırması okunamadı.");
  const urlRaw = s.signupSmsHttpUrl?.trim();
  if (!urlRaw || !/^https?:\/\//i.test(urlRaw)) {
    throw new Error("Geçersiz SMS webhook URL. Süper yönetici panelinden kontrol edin.");
  }
  const method = (s.signupSmsHttpMethod || "POST").toUpperCase();
  const timeoutMs = Math.min(Math.max(s.signupSmsHttpTimeoutMs || 15000, 3000), 120_000);

  let extraHeaders: Record<string, string> = {};
  try {
    const parsed = JSON.parse(s.signupSmsHttpHeadersJson || "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      extraHeaders = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k, applyTemplate(String(v), phoneE164, code, message)]),
      );
    }
  } catch {
    console.warn("[signup SMS] signupSmsHttpHeadersJson geçersiz JSON, yok sayılıyor.");
  }

  const headers: Record<string, string> = { ...extraHeaders };
  const authName = s.signupSmsAuthHeaderName?.trim();
  const authVal = s.signupSmsAuthHeaderValue?.trim();
  if (authName && authVal) {
    headers[authName] = applyTemplate(authVal, phoneE164, code, message);
  }

  if (method === "GET") {
    const url = applyUrlTemplate(urlRaw, phoneE164, code, message);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "GET", headers, signal: ac.signal });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("[signup SMS HTTP GET]", res.status, t.slice(0, 500));
        throw new Error("SMS servisi yanıt vermedi. Yapılandırmayı kontrol edin.");
      }
    } finally {
      clearTimeout(timer);
    }
    return;
  }

  let bodyStr = (s.signupSmsHttpBodyTemplate || "").trim();
  if (!bodyStr) {
    bodyStr = JSON.stringify({
      phone: "{{phone}}",
      code: "{{code}}",
      message: "{{message}}",
    });
  }
  bodyStr = applyTemplate(bodyStr, phoneE164, code, message);
  if (!headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(urlRaw, { method: "POST", headers, body: bodyStr, signal: ac.signal });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[signup SMS HTTP POST]", res.status, t.slice(0, 500));
      throw new Error("SMS servisi yanıt vermedi. Yapılandırmayı kontrol edin.");
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Öncelik: İleti Merkezi (panel + anahtarlar) → genel HTTP webhook → Twilio env → yoksa günlük.
 */
export async function sendSignupSmsOtpDispatch(
  prisma: PrismaClient,
  phoneE164: string,
  code: string,
): Promise<{ sent: boolean; channel: "iletimerkezi" | "http" | "twilio" | "log" }> {
  const message = DEFAULT_OTP_SMS_TEXT_TR(code);
  const s = await getSignupSmsAdminConfig(prisma);
  const imOn = Boolean(
    s?.signupIletiMerkeziEnabled &&
      s.signupIletiMerkeziApiKey?.trim() &&
      s.signupIletiMerkeziApiSecret?.trim() &&
      s.signupIletiMerkeziSender?.trim(),
  );
  const httpOn = Boolean(s?.signupSmsHttpEnabled && s.signupSmsHttpUrl?.trim());

  if (imOn && s) {
    const timeoutMs = Math.min(Math.max(s.signupSmsHttpTimeoutMs || 15000, 3000), 120_000);
    await sendIletiMerkeziSignupOtp({
      apiKey: s.signupIletiMerkeziApiKey,
      apiSecret: s.signupIletiMerkeziApiSecret,
      sender: s.signupIletiMerkeziSender,
      phoneE164,
      messageText: message,
      timeoutMs,
    });
    return { sent: true, channel: "iletimerkezi" };
  }

  if (httpOn) {
    await sendHttpWebhookSms(prisma, phoneE164, code, message);
    return { sent: true, channel: "http" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (sid && token && from) {
    await sendTwilioSignupSms(phoneE164, message);
    return { sent: true, channel: "twilio" };
  }

  console.warn("[SMS OTP atlandı — panel HTTP kapalı, Twilio env yok]", phoneE164, message);
  return { sent: false, channel: "log" };
}
