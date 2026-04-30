import { getResolvedSmtpForSend } from "@/lib/resolveSmtpConfig";
import { getSignupOtpTtlMinutes } from "@/lib/signupOtpTtl";
import { smtpExplicitEnvelopeEnabled } from "@/lib/smtpConfig";

/** SMTP/nodemailer hatalarini kullaniciya okunur metne cevirir. */
export function formatSmtpSendError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (/SMTP yapilandirilmadi|OTP_PEPPER/i.test(m)) return m;
  }
  const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
  const msg = (e?.message || String(err)).trim();
  const code = e?.code;
  const rc = e?.responseCode;
  const combined = `${msg} ${String(e?.response || "")}`;

  if (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ESOCKETTIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET"
  ) {
    return "E-posta sunucusuna baglanilamadi. SMTP host, port (587 veya 465) ve ag/guvenlik duvari ayarlarini kontrol edin.";
  }
  if (
    rc === 535 ||
    /authentication failed|invalid login|535|username and password not accepted|bad credentials/i.test(combined)
  ) {
    return "SMTP giris basarisiz. Kullanici adi ve sifreyi kontrol edin; Gmail ve benzeri servislerde genelde «uygulama sifresi» gerekir.";
  }
  if (rc === 554 || rc === 553 || /sender address|mail from|not allowed|spf|dmarc/i.test(combined)) {
    return "Gonderici (From) adresi reddedildi. Paneldeki gonderen adres ile SMTP hesabinin uyumlu oldugundan emin olun.";
  }
  if (rc === 550 || /Invalid [`']from[`'] field|550 Invalid/i.test(combined)) {
    return "Gonderici (From) biçimi veya MAIL FROM gecersiz. Panelde «Gonderen e-posta» alanina tam adres (ornek@alanadiniz.com) yazin; Resend SMTP kullanici adi `resend` From olamaz.";
  }
  if (/certificate|self signed|unable to verify|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(combined)) {
    return "SMTP TLS sertifikasi dogrulanamadi. Test ortaminda .env ile SMTP_TLS_REJECT_UNAUTHORIZED=false deneyebilirsiniz (uretimde onerilmez).";
  }
  return msg.length > 220
    ? "E-posta gonderilirken sunucu hatasi olustu. SMTP ayarlarini ve sunucu gunluklerini kontrol edin."
    : msg;
}

async function sendMailResolved(params: { to: string; subject: string; text: string; html?: string }) {
  const resolved = await getResolvedSmtpForSend(undefined);
  if (!resolved) {
    throw new Error(
      "SMTP yapilandirilmadi. Panelde SMTP host + kullanici + sifre (sifre bos birakilip yalnizca .env SMTP_PASS da olabilir) veya tam ortam SMTP_HOST, SMTP_USER, SMTP_PASS tanimlayin.",
    );
  }
  try {
    await resolved.transport.sendMail({
      from: resolved.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.html ? { html: params.html } : {}),
      ...(smtpExplicitEnvelopeEnabled() && resolved.envelopeFrom
        ? { envelope: { from: resolved.envelopeFrom, to: params.to } }
        : {}),
    });
  } catch (e) {
    console.error("[sendMailResolved]", e);
    throw new Error(formatSmtpSendError(e));
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tıklanabilir doğrulama bağlantısı yok — yalnızca sitedeki forma kod girilir. */
function signupEmailOtpHtml(code: string, ttlMinutes: number): string {
  const c = escapeHtml(code.replace(/\D/g, "").slice(0, 6) || code.trim());
  const ttlLabel = ttlMinutes <= 1 ? "1 dakika" : `${ttlMinutes} dakika`;
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;">
  <div style="max-width:32rem;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
    <p style="margin:0 0 12px;">Merhaba,</p>
    <p style="margin:0 0 8px;">Üye kayıt için e-posta doğrulama <strong>kodunuz</strong> (altı hane):</p>
    <p style="margin:16px 0;padding:16px 12px;text-align:center;font-size:1.75rem;font-weight:700;letter-spacing:0.4em;font-family:ui-monospace,Consolas,monospace;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#9a3412;">${c}</p>
    <p style="margin:0 0 12px;font-size:0.9375rem;">Kod <strong>${escapeHtml(ttlLabel)}</strong> geçerlidir; süre dolarsa üyelik sayfasından yeni kod isteyin.</p>
    <p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:0.8125rem;color:#64748b;">
      Bu e-postada hesabınızı onaylamanız için tıklanacak bir <strong>bağlantı yoktur</strong>.
      Kodu yalnızca sitedeki üyelik formunda «E-postayı doğrula» adımına yazın.
      Başka bir adresten gelen doğrulama linklerine güvenmeyin.
    </p>
    <p style="margin:12px 0 0;font-size:0.8125rem;color:#64748b;">Bu isteği siz yapmadıysanız bu e-postayı yok sayın.</p>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  temporaryPassword: string;
}) {
  const targetName = params.name || params.to;
  await sendMailResolved({
    to: params.to,
    subject: "Sifre Sifirlama Bilgisi",
    text: `Merhaba ${targetName},\n\nHesabiniz icin gecici sifreniz: ${params.temporaryPassword}\nLutfen giris yaptiktan sonra sifrenizi degistirin.\n`,
  });
}

export async function sendSignupEmailOtp(params: { to: string; code: string }) {
  const ttlMinutes = getSignupOtpTtlMinutes();
  const ttlLabel = ttlMinutes <= 1 ? "1 dakika" : `${ttlMinutes} dakika`;
  const code = params.code.replace(/\D/g, "").slice(0, 6) || params.code.trim();
  const text = `Merhaba,

Üye kayıt e-posta doğrulama kodunuz (altı hane): ${code}

Kod ${ttlLabel} geçerlidir; süre dolarsa üyelik sayfasından yeni kod isteyin.

Önemli: Bu e-postada tıklanacak bir doğrulama bağlantısı yoktur. Kodu yalnızca sitedeki forma girin.

Bu isteği siz yapmadıysanız bu e-postayı yok sayın.
`;
  await sendMailResolved({
    to: params.to,
    /** ASCII konu: bazi MTA/anti-spam zincirlerinde Unicode konu sorun cikarabilir. */
    subject: "Uyelik: E-posta dogrulama kodu (6 hane)",
    text,
    html: signupEmailOtpHtml(code, ttlMinutes),
  });
}
