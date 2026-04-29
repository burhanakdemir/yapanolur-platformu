import type { SupportConversation } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { getAppUrl } from "@/lib/appUrl";
import {
  SUPPORT_EMAIL_THROTTLE_MS,
  SUPPORT_ONLINE_GRACE_MINUTES,
} from "@/lib/supportConstants";

export async function isAnySupportStaffOnline(): Promise<boolean> {
  const since = new Date(Date.now() - SUPPORT_ONLINE_GRACE_MINUTES * 60 * 1000);
  const n = await prisma.adminSupportPresence.count({
    where: {
      isAvailable: true,
      lastPingAt: { gte: since },
    },
  });
  return n > 0;
}

async function staffNotificationEmails(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });
  return rows.map((r) => r.email).filter(Boolean);
}

export async function maybeNotifyStaffOffline(params: {
  conversation: SupportConversation;
  isNewConversation: boolean;
  reason: "new" | "visitor_message";
}): Promise<void> {
  if (params.conversation.status === "KAPALI") return;
  if (await isAnySupportStaffOnline()) return;

  const now = Date.now();
  if (!params.isNewConversation && params.reason === "visitor_message") {
    const last = params.conversation.lastEmailNotifiedAt;
    if (last && now - last.getTime() < SUPPORT_EMAIL_THROTTLE_MS) {
      return;
    }
  }

  const toList = await staffNotificationEmails();
  if (toList.length === 0) {
    return;
  }

  const appUrl = getAppUrl();
  const adminUrl = `${appUrl}/admin/support#${params.conversation.id}`;
  const subject =
    params.isNewConversation || params.reason === "new"
      ? "[Yapanolur] Yeni canlı destek talebi"
      : "[Yapanolur] Canlı destek: yeni ziyaretçi mesajı (çevrimdışı)";

  const text = `Destek sohbeti: ${params.conversation.id}\nYönetici paneli: ${adminUrl}\n\nÇevrimiçi yönetici yokken bildirim gönderildi.`;
  const html = `<p><strong>Destek sohbeti</strong><br/>ID: <code>${params.conversation.id}</code></p>
<p><a href="${adminUrl}">Yönetici panelinde aç</a></p>
<p>Çevrimiçi yönetici yokken e-posta ile bildirim gönderildi.</p>`;

  const extra = process.env.SUPPORT_NOTIFY_EXTRA_EMAIL?.trim();
  if (extra && !toList.includes(extra)) {
    toList.push(extra);
  }

  for (const to of toList) {
    await sendTransactionalEmail({ to, subject, text, html });
  }

  await prisma.supportConversation.update({
    where: { id: params.conversation.id },
    data: { lastEmailNotifiedAt: new Date(now) },
  });
}

