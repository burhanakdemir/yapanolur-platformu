import type { Ad, Profession } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import { findUserIdsForNewAdEmailMatch } from "@/lib/newAdEmailRecipients";
import {
  filterAllowedWebhookUrls,
  parseNewAdEmailWebhookUrls,
} from "@/lib/newAdEmailWebhooksJson";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import type { NewAdApprovedWebhookPayload } from "@/lib/newAdApprovedWebhookPayload";

const BATCH = 12;
const BATCH_GAP_MS = 80;

type AdForNotify = Ad & { profession: Profession | null };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Yönetici onayı sonrası: ayar açıksa il+meslek eşleşen üyelere e-posta, kayıtlı URL’lere POST.
 * İdempotent çağrı için onay anında yalnızca bir kez tetikleyin.
 */
export async function notifyOnAdApproved(ad: AdForNotify): Promise<void> {
  const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) return;
  const doMemberEmails = settings.newAdEmailAutoEnabled;
  const doWebhooks = settings.newAdEmailWebhookEnabled;
  if (!doMemberEmails && !doWebhooks) return;

  const baseUrl = getAppUrl();
  const adUrl = `${baseUrl}/ads/${ad.id}`;

  const prof =
    ad.profession ??
    (ad.professionId
      ? await prisma.profession.findUnique({ where: { id: ad.professionId } })
      : null);
  const professionName = prof?.name ?? null;

  const matched = ad.professionId
    ? await findUserIdsForNewAdEmailMatch({
        professionId: ad.professionId,
        province: ad.province,
        excludeUserId: ad.ownerId,
      })
    : [];

  let smtpNotConfigured = false;
  if (doMemberEmails && matched.length > 0) {
    const titleDisplay = displayAdTitle(ad.title);
    const subject = `Yeni ilan: #${ad.listingNumber} — ${titleDisplay}`;
    const textBody = [
      `Sizin il ve meslek tercihinizle eşleşen yeni bir ilan yayındadı.`,
      ``,
      `İlan no: #${ad.listingNumber}`,
      `Başlık: ${titleDisplay}`,
      `İl: ${ad.province}`,
      `Meslek: ${professionName ?? "—"}`,
      ``,
      `Görüntülemek için: ${adUrl}`,
    ].join("\n");
    const htmlBody = [
      `<p>Sizin il ve meslek tercihinizle eşleşen yeni bir ilan yayındadır.</p>`,
      `<p><strong>No:</strong> #${ad.listingNumber}<br/>`,
      `<strong>Başlık:</strong> ${escapeHtml(titleDisplay)}<br/>`,
      `<strong>İl:</strong> ${escapeHtml(ad.province)}<br/>`,
      `<strong>Meslek:</strong> ${escapeHtml(professionName ?? "—")}</p>`,
      `<p><a href="${adUrl}">İlanı aç</a></p>`,
    ].join("");

    for (let i = 0; i < matched.length; i += BATCH) {
      const chunk = matched.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async (row) => {
          const r = await sendTransactionalEmail({
            to: row.email,
            subject,
            text: textBody,
            html: htmlBody,
            fromAdminOverride: settings.newAdEmailFromAddress,
          });
          if (!r.sent) {
            if (r.reason === "smtp_unconfigured") smtpNotConfigured = true;
          }
        }),
      );
      if (i + BATCH < matched.length) await sleep(BATCH_GAP_MS);
    }
  }

  if (doWebhooks) {
    const rawUrls = parseNewAdEmailWebhookUrls(settings.newAdEmailWebhookUrlsJson);
    const webhooks = filterAllowedWebhookUrls(rawUrls);
    if (webhooks.length > 0) {
      const secret = settings.newAdEmailWebhookSecret?.trim() ?? "";
      const payload: NewAdApprovedWebhookPayload = {
        event: "ad.approved",
        at: new Date().toISOString(),
        ad: {
          id: ad.id,
          listingNumber: ad.listingNumber,
          title: ad.title,
          titleDisplay: displayAdTitle(ad.title),
          description: ad.description,
          province: ad.province,
          city: ad.city,
          district: ad.district,
          professionId: ad.professionId,
          professionName,
          ownerId: ad.ownerId,
          approvedAt: ad.approvedAt ? ad.approvedAt.toISOString() : new Date().toISOString(),
        },
        matchedMembers: matched.map((m) => ({ userId: m.id, email: m.email })),
        emailDelivery: {
          memberEmailsEnabled: doMemberEmails,
          attempted: doMemberEmails ? matched.length : 0,
          smtpNotConfigured,
        },
      };

      for (const url of webhooks) {
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (secret) headers.Authorization = `Bearer ${secret}`;
          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20_000),
          });
          if (!res.ok) {
            console.warn(`[notifyOnAdApproved] webhook ${url} -> ${res.status}`);
          }
        } catch (e) {
          console.error(`[notifyOnAdApproved] webhook ${url}`, e);
        }
      }
    }
  }

  if (smtpNotConfigured && doMemberEmails) {
    console.warn(
      "[notifyOnAdApproved] SMTP yok: üye e-postaları atlanmış olabilir. Ortam: SMTP_HOST, SMTP_USER, SMTP_PASS.",
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
