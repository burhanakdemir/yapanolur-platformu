import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getDefaultSmtpFromAddress, smtpEnvelopeMailFrom } from "@/lib/smtpConfig";

type Resolved = {
  transport: nodemailer.Transporter;
  /** Message From (baslik); cogu saglayicida SMTP kullanicisiyla uyumlu olmali. */
  from: string;
  /** SMTP MAIL FROM — geçerli e-posta; Resend vb. için AUTH kullanıcısı (`resend`) kullanılmaz. Yoksa zarf gönderilmez. */
  envelopeFrom: string | null;
  /** Nereden geldi: panel | env (log / debug) */
  source: "panel" | "env";
};

function createSmtpTransport(
  host: string,
  port: number,
  secure: boolean,
  auth: { user: string; pass: string },
): nodemailer.Transporter {
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
    connectionTimeout: 25_000,
    socketTimeout: 25_000,
    greetingTimeout: 15_000,
    tls: { rejectUnauthorized },
    /**
     * Varsayilan: false (nodemailer uyumu). Bazi aglarda zorunlu STARTTLS baglantiyi kesebilir.
     * Kurumsal sunucuda gerekirse: SMTP_REQUIRE_TLS=1 veya true
     */
    requireTLS:
      process.env.SMTP_REQUIRE_TLS === "1" || process.env.SMTP_REQUIRE_TLS === "true",
  });
}

function pickFromAddress(
  fromAdmin: string | null | undefined,
  settingsFrom: string | null | undefined,
  smtpUserFallback: string,
  mode: "panel" | "env",
) {
  const a = (fromAdmin ?? "").trim() || (settingsFrom ?? "").trim();
  if (a) return a;
  if (mode === "panel") return smtpUserFallback;
  return getDefaultSmtpFromAddress() || smtpUserFallback;
}

/**
 * Panelde SMTP host+user (+ sifre DB veya .env yedegi) doluysa onu kullanir;
 * degilse tam `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` ortam degiskenlerini kullanir.
 *
 * Not: Panelde host+kullanici kayitli, sifre yalnizca .env `SMTP_PASS` ise (DB sifre bos)
 * onceki davranis tum env bekledigi icin SMTP_HOST bos ise hic gonderim olmuyordu — sifre .env'den tamamlanir.
 */
export async function getResolvedSmtpForSend(
  fromAdminOverride: string | null | undefined,
): Promise<Resolved | null> {
  const s = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  const pHost = s?.smtpHost?.trim() ?? "";
  const pUser = s?.smtpUser?.trim() ?? "";
  const pPassDb = s?.smtpPass?.trim() ?? "";
  const envPass = process.env.SMTP_PASS?.trim() ?? "";
  /** Panel kullanicisi + host varsa sifre once DB, yoksa yalnizca ortam (panel sifre alani bos birakilip .env kullanimi). */
  const panelPass = pPassDb || envPass;

  if (s && pHost && pUser && panelPass) {
    const port = s.smtpPort > 0 ? s.smtpPort : 587;
    const secure = Boolean(s.smtpSecure) || port === 465;
    const transport = createSmtpTransport(pHost, port, secure, { user: pUser, pass: panelPass });
    const from = pickFromAddress(
      fromAdminOverride,
      s.newAdEmailFromAddress,
      pUser,
      "panel",
    );
    return {
      transport,
      from,
      envelopeFrom: smtpEnvelopeMailFrom(from, pUser),
      source: "panel",
    };
  }

  const h = process.env.SMTP_HOST?.trim() ?? "";
  const u = process.env.SMTP_USER?.trim() ?? "";
  const p = envPass;
  if (!h || !u || !p) {
    return null;
  }
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const transport = createSmtpTransport(h, port, secure, { user: u, pass: p });
  const from = pickFromAddress(
    fromAdminOverride,
    s?.newAdEmailFromAddress,
    u,
    "env",
  );
  return {
    transport,
    from,
    envelopeFrom: smtpEnvelopeMailFrom(from, u),
    source: "env",
  };
}
