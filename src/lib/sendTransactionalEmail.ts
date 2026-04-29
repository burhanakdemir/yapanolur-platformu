import { getResolvedSmtpForSend } from "./resolveSmtpConfig";
import { smtpExplicitEnvelopeEnabled } from "./smtpConfig";

type SendParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** AdminSettings `newAdEmailFromAddress` — boşsa ayarlardan / SMTP kullanıcısı */
  fromAdminOverride?: string;
};

/**
 * Panel SMTP veya ortam `SMTP_*`; yapılandırma yoksa hata fırlatmaz.
 */
export async function sendTransactionalEmail(
  p: SendParams,
): Promise<{ sent: true } | { sent: false; reason: "smtp_unconfigured" | "error"; message?: string }> {
  const resolved = await getResolvedSmtpForSend(p.fromAdminOverride);
  if (!resolved) {
    return { sent: false, reason: "smtp_unconfigured" };
  }
  try {
    await resolved.transport.sendMail({
      from: resolved.from,
      to: p.to,
      subject: p.subject,
      text: p.text,
      html: p.html,
      ...(smtpExplicitEnvelopeEnabled() ? { envelope: { from: resolved.envelopeFrom, to: p.to } } : {}),
    });
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[sendTransactionalEmail]", e);
    return { sent: false, reason: "error", message };
  }
}
