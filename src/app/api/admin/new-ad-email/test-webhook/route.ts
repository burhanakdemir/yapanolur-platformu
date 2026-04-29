import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { filterAllowedWebhookUrls, parseNewAdEmailWebhookUrls } from "@/lib/newAdEmailWebhooksJson";

const bodySchema = z.object({
  url: z.string().optional(),
});

/**
 * Kayıtlı veya istekte verilen bir webhook URL’sine örnek POST (yönetici testi).
 */
export async function POST(req: Request) {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!isStaffAdminRole(session?.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
  }

  const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
  const fromDb = filterAllowedWebhookUrls(parseNewAdEmailWebhookUrls(settings?.newAdEmailWebhookUrlsJson));
  const candidate = (body.url ?? "").trim();
  const target = candidate
    ? (filterAllowedWebhookUrls([candidate])[0] ?? null)
    : fromDb[0] ?? null;

  if (!target) {
    return NextResponse.json(
      { error: "Gecerli bir URL yok. Ayarlara kaydedin veya istekte url gonderin." },
      { status: 400 },
    );
  }

  const secret = settings?.newAdEmailWebhookSecret?.trim() ?? "";
  const payload = {
    event: "ad.approved" as const,
    test: true,
    at: new Date().toISOString(),
    message: "Bu bir test cagrisidir; gercek ilan verisi icermez.",
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      url: target,
      responsePreview: text.slice(0, 500),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Baglanti hatasi", url: target },
      { status: 502 },
    );
  }
}
