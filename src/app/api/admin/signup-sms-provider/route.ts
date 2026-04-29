import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { invalidateSignupSmsConfigCache } from "@/lib/signupSmsDispatch";
import { isLikelyDatabaseConnectionError, isLikelyPrismaSchemaColumnMissing } from "@/lib/dbErrors";

export const dynamic = "force-dynamic";

async function requireSuperAdminApi() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!isSuperAdminRole(session?.role)) {
    return NextResponse.json(
      { error: "Bu işlem yalnızca süper yönetici içindir." },
      { status: 403 },
    );
  }
  return null;
}

function redact(n: string, visible = 3): string {
  if (!n) return "";
  if (n.length <= visible) return "•".repeat(6);
  return "•".repeat(6) + n.slice(-visible);
}

const postSchema = z.object({
  signupSmsHttpEnabled: z.boolean().optional(),
  signupSmsHttpMethod: z.enum(["POST", "GET"]).optional(),
  signupSmsHttpUrl: z.string().optional(),
  signupSmsHttpHeadersJson: z.string().optional(),
  signupSmsHttpBodyTemplate: z.string().optional(),
  signupSmsAuthHeaderName: z.string().optional(),
  signupSmsAuthHeaderValue: z.string().optional(),
  signupSmsHttpTimeoutMs: z.coerce.number().int().min(3000).max(120_000).optional(),
  signupIletiMerkeziEnabled: z.boolean().optional(),
  signupIletiMerkeziApiKey: z.string().optional(),
  signupIletiMerkeziApiSecret: z.string().optional(),
  signupIletiMerkeziSender: z.string().optional(),
});

export async function GET() {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    const s = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const twilioEnv =
      Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
      Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
      Boolean(process.env.TWILIO_FROM_NUMBER?.trim());
    return NextResponse.json({
      signupSmsHttpEnabled: s.signupSmsHttpEnabled,
      signupSmsHttpMethod: s.signupSmsHttpMethod || "POST",
      signupSmsHttpUrl: s.signupSmsHttpUrl || "",
      signupSmsHttpHeadersJson: s.signupSmsHttpHeadersJson || "{}",
      signupSmsHttpBodyTemplate: s.signupSmsHttpBodyTemplate || "",
      signupSmsAuthHeaderName: s.signupSmsAuthHeaderName || "",
      signupSmsAuthHeaderValueMasked: s.signupSmsAuthHeaderValue
        ? redact(s.signupSmsAuthHeaderValue)
        : "",
      hasAuthHeaderValue: Boolean(s.signupSmsAuthHeaderValue?.trim()),
      signupSmsHttpTimeoutMs: s.signupSmsHttpTimeoutMs ?? 15000,
      signupIletiMerkeziEnabled: s.signupIletiMerkeziEnabled,
      signupIletiMerkeziApiKey: s.signupIletiMerkeziApiKey || "",
      signupIletiMerkeziApiSecretMasked: s.signupIletiMerkeziApiSecret
        ? redact(s.signupIletiMerkeziApiSecret)
        : "",
      hasIletiMerkeziSecret: Boolean(s.signupIletiMerkeziApiSecret?.trim()),
      signupIletiMerkeziSender: s.signupIletiMerkeziSender || "",
      twilioFallbackAvailable: twilioEnv,
      priorityHint:
        "Öncelik: İleti Merkezi etkin ve API anahtarı + gizli anahtar + gönderici doluysa api.iletimerkezi.com; değilse genel HTTP webhook; o da yoksa Twilio. Hiçbiri yoksa SMS gönderilmez.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        { error: "Veritabanına ulaşılamıyor. DATABASE_URL ile kontrol edin." },
        { status: 503 },
      );
    }
    if (isLikelyPrismaSchemaColumnMissing(e) || /column|does not exist|P2022/i.test(msg)) {
      return NextResponse.json(
        { error: "Veritabanı şeması güncel değil. `npm run db:migrate` çalıştırın." },
        { status: 503 },
      );
    }
    console.error("GET /api/admin/signup-sms-provider", e);
    return NextResponse.json({ error: "Ayarlar okunamadı." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    const raw = await req.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;
    const write: Record<string, unknown> = {};

    if (data.signupSmsHttpEnabled !== undefined) write.signupSmsHttpEnabled = data.signupSmsHttpEnabled;
    if (data.signupSmsHttpMethod !== undefined) write.signupSmsHttpMethod = data.signupSmsHttpMethod;
    if (data.signupSmsHttpUrl !== undefined) write.signupSmsHttpUrl = data.signupSmsHttpUrl.trim();
    if (data.signupSmsHttpHeadersJson !== undefined) {
      write.signupSmsHttpHeadersJson = data.signupSmsHttpHeadersJson.trim() || "{}";
    }
    if (data.signupSmsHttpBodyTemplate !== undefined) {
      write.signupSmsHttpBodyTemplate = data.signupSmsHttpBodyTemplate.trim();
    }
    if (data.signupSmsAuthHeaderName !== undefined) {
      write.signupSmsAuthHeaderName = data.signupSmsAuthHeaderName.trim();
    }
    if (data.signupSmsAuthHeaderValue !== undefined && data.signupSmsAuthHeaderValue.trim() !== "") {
      write.signupSmsAuthHeaderValue = data.signupSmsAuthHeaderValue.trim();
    }
    if (data.signupSmsHttpTimeoutMs !== undefined) {
      write.signupSmsHttpTimeoutMs = data.signupSmsHttpTimeoutMs;
    }
    if (data.signupIletiMerkeziEnabled !== undefined) {
      write.signupIletiMerkeziEnabled = data.signupIletiMerkeziEnabled;
    }
    if (data.signupIletiMerkeziApiKey !== undefined) {
      write.signupIletiMerkeziApiKey = data.signupIletiMerkeziApiKey.trim();
    }
    if (data.signupIletiMerkeziApiSecret !== undefined && data.signupIletiMerkeziApiSecret.trim() !== "") {
      write.signupIletiMerkeziApiSecret = data.signupIletiMerkeziApiSecret.trim();
    }
    if (data.signupIletiMerkeziSender !== undefined) {
      write.signupIletiMerkeziSender = data.signupIletiMerkeziSender.trim();
    }

    if (Object.keys(write).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
    }

    if (data.signupIletiMerkeziEnabled === true) {
      const keyOk = Boolean(data.signupIletiMerkeziApiKey?.trim());
      const senderOk = Boolean(data.signupIletiMerkeziSender?.trim());
      const newSecret = data.signupIletiMerkeziApiSecret?.trim() ?? "";
      const existing = await prisma.adminSettings.findUnique({
        where: { id: "singleton" },
        select: { signupIletiMerkeziApiSecret: true },
      });
      const secretOk = Boolean(newSecret) || Boolean(existing?.signupIletiMerkeziApiSecret?.trim());
      if (!keyOk || !senderOk || !secretOk) {
        return NextResponse.json(
          {
            error:
              "İleti Merkezi açıkken API anahtarı, gönderici başlığı ve gizli anahtar gerekir. Gizli anahtar yalnızca bu alanda kayıtlıysa tekrar yazmanız gerekmez; ilk kurulumda veya değiştirdiğinizde mutlaka girin.",
          },
          { status: 400 },
        );
      }
    }

    try {
      await prisma.adminSettings.upsert({
        where: { id: "singleton" },
        update: write,
        create: { id: "singleton", ...write },
      });
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      if (isLikelyDatabaseConnectionError(dbErr)) {
        return NextResponse.json(
          { error: "Veritabanına ulaşılamıyor. DATABASE_URL ile kontrol edin." },
          { status: 503 },
        );
      }
      if (isLikelyPrismaSchemaColumnMissing(dbErr) || /column|does not exist|P2022/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Veritabanı şeması güncel değil. Proje kökünde `npm run db:migrate` çalıştırın (İleti Merkezi sütunları gerekir).",
          },
          { status: 503 },
        );
      }
      throw dbErr;
    }
    invalidateSignupSmsConfigCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/signup-sms-provider", error);
    return NextResponse.json({ error: "Kayıt başarısız." }, { status: 500 });
  }
}
