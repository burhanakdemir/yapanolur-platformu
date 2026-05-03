import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";

/**
 * Profil sahibine yorum / oy bildirimi e-postaları.
 * `MEMBER_PROFILE_EMAIL_NOTIFY=0` veya `false` ise gönderim yapılmaz (varsayılan: açık).
 *
 * Yorum metni e-postada, sitede profil sahibinin görebileceği içerikle aynıdır; KVKK kapsamında
 * işlenmesi için metnin bildirim kanalında da iletilmesi bilinçli tercihtir.
 */

function memberProfileEmailNotifyEnabled(): boolean {
  const raw = (process.env.MEMBER_PROFILE_EMAIL_NOTIFY ?? "").trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatActorLabel(name: string | null | undefined, memberNumber: number | null | undefined): string {
  const n = name?.trim();
  if (n) return n;
  if (memberNumber != null && Number.isFinite(memberNumber)) return `Üye #${memberNumber}`;
  return "Üye";
}

function profilePublicUrl(userId: string): string {
  return `${getAppUrl()}/uye/${userId}`;
}

/** Yeni profil yorumu — hedef üyeye (profil sahibi). Fire-and-forget; hata loglanır, fırlatılmaz. */
export async function notifyProfileOwnerNewComment(params: {
  targetUserId: string;
  commentBody: string;
  commentCreatedAt: Date;
  fromUserId: string;
  fromMemberNumber: number | null;
  fromName: string | null;
}): Promise<void> {
  if (!memberProfileEmailNotifyEnabled()) return;
  try {
    const target = await prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { email: true },
    });
    const to = target?.email?.trim();
    if (!to) return;

    const actor = formatActorLabel(params.fromName, params.fromMemberNumber);
    const when = params.commentCreatedAt.toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const profileUrl = profilePublicUrl(params.targetUserId);
    const subject = "Profilinize yeni yorum";
    const text = [
      `Merhaba,`,
      ``,
      `${actor} profilinize yorum bıraktı.`,
      `Zaman: ${when}`,
      ``,
      `Yorum:`,
      params.commentBody,
      ``,
      `Profilinizi görüntülemek için: ${profileUrl}`,
      ``,
      `Bu e-posta otomatik bilgilendirmedir.`,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:16px;font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;">
  <div style="max-width:32rem;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
    <p style="margin:0 0 12px;"><strong>${escapeHtml(actor)}</strong> profilinize yorum bıraktı.</p>
    <p style="margin:0 0 8px;font-size:0.875rem;color:#64748b;">${escapeHtml(when)}</p>
    <div style="margin:16px 0;padding:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(params.commentBody)}</p>
    </div>
    <p style="margin:16px 0 0;"><a href="${escapeHtml(profileUrl)}" style="color:#c2410c;">Profili aç</a></p>
    <p style="margin:16px 0 0;font-size:0.75rem;color:#94a3b8;">Otomatik bilgilendirme.</p>
  </div>
</body></html>`;

    const r = await sendTransactionalEmail({ to, subject, text, html });
    if (!r.sent && r.reason === "smtp_unconfigured") {
      // Sessiz; geliştirme ortamı
      return;
    }
    if (!r.sent) {
      console.error("[notifyProfileOwnerNewComment] mail not sent:", r.message ?? r.reason);
    }
  } catch (e) {
    console.error("[notifyProfileOwnerNewComment]", e);
  }
}

/** Olumlu / olumsuz oy — yalnızca yeni oy veya LIKE↔DISLIKE değişiminde (spam azaltma). */
export async function notifyProfileOwnerPeerVote(params: {
  targetUserId: string;
  voteType: "LIKE" | "DISLIKE";
  voterUserId: string;
}): Promise<void> {
  if (!memberProfileEmailNotifyEnabled()) return;
  try {
    const target = await prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { email: true },
    });
    const to = target?.email?.trim();
    if (!to) return;

    const voter = await prisma.user.findUnique({
      where: { id: params.voterUserId },
      select: { memberNumber: true, name: true },
    });
    const actor = formatActorLabel(voter?.name ?? null, voter?.memberNumber ?? null);
    const verb =
      params.voteType === "LIKE" ? "olumlu beğeni (LIKE)" : "olumsuz değerlendirme (DISLIKE)";
    const profileUrl = profilePublicUrl(params.targetUserId);
    const subject =
      params.voteType === "LIKE" ? "Profilinize olumlu beğeni" : "Profilinize olumsuz oy";

    const text = [
      `Merhaba,`,
      ``,
      `${actor} profilinize ${verb} bıraktı.`,
      ``,
      `Profilinizi görüntülemek için: ${profileUrl}`,
      ``,
      `Bu e-posta otomatik bilgilendirmedir.`,
    ].join("\n");

    const voteLabel = params.voteType === "LIKE" ? "Olumlu beğeni (LIKE)" : "Olumsuz oy (DISLIKE)";
    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:16px;font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;">
  <div style="max-width:32rem;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
    <p style="margin:0 0 12px;"><strong>${escapeHtml(actor)}</strong> profilinize şunu bıraktı: <strong>${escapeHtml(voteLabel)}</strong>.</p>
    <p style="margin:16px 0 0;"><a href="${escapeHtml(profileUrl)}" style="color:#c2410c;">Profili aç</a></p>
    <p style="margin:16px 0 0;font-size:0.75rem;color:#94a3b8;">Otomatik bilgilendirme.</p>
  </div>
</body></html>`;

    const r = await sendTransactionalEmail({ to, subject, text, html });
    if (!r.sent && r.reason === "smtp_unconfigured") return;
    if (!r.sent) {
      console.error("[notifyProfileOwnerPeerVote] mail not sent:", r.message ?? r.reason);
    }
  } catch (e) {
    console.error("[notifyProfileOwnerPeerVote]", e);
  }
}
