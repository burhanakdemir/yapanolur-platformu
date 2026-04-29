import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { getResolvedSmtpForSend } from "@/lib/resolveSmtpConfig";
import { smtpExplicitEnvelopeEnabled } from "@/lib/smtpConfig";

const bodySchema = z.object({
  to: z.string().email().optional(),
});

/**
 * Yapılandırılmış SMTP ile kısa bir test e-postası gönderir.
 */
export async function POST(req: Request) {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!isStaffAdminRole(session?.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }
  const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  const to =
    (body.to?.trim() ||
      settings?.newAdEmailFromAddress?.trim() ||
      session?.email ||
      "").trim();
  if (!to) {
    return NextResponse.json(
      { error: "Alici yok. Istekte to veya gonderen/adres alanini doldurun." },
      { status: 400 },
    );
  }
  const resolved = await getResolvedSmtpForSend(settings?.newAdEmailFromAddress);
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "SMTP yapılandırılmamış. Panelde host + kullanıcı + şifre (veya şifre yalnızca .env SMTP_PASS) ya da tam .env SMTP_HOST, SMTP_USER, SMTP_PASS tanımlayın.",
      },
      { status: 400 },
    );
  }
  const subject = `SMTP test — ${new Date().toISOString()}`;
  const text = `Bu mesaj, yönetici paneli testidir.\nKaynak: ${resolved.source}\nGönderen: ${resolved.from}\n`;
  const html = `<p>Bu mesaj, yönetici paneli SMTP testidir.</p><p><strong>Kaynak:</strong> ${resolved.source}</p><p><strong>Gönderen:</strong> ${resolved.from}</p>`;
  try {
    await resolved.transport.sendMail({
      from: resolved.from,
      to,
      subject,
      text,
      html,
      ...(smtpExplicitEnvelopeEnabled() ? { envelope: { from: resolved.envelopeFrom, to } } : {}),
    });
    return NextResponse.json({ ok: true, to, from: resolved.from, source: resolved.source });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gönderim hatasi" },
      { status: 502 },
    );
  }
}
