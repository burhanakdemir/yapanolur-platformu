import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";
import { IYZICO_BASE_URL_CHOICES } from "@/lib/paymentConfig";
import { isLikelyDatabaseConnectionError, isLikelyPrismaSchemaColumnMissing } from "@/lib/dbErrors";

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

function hasEnv(s: string | undefined) {
  return Boolean(s && s.trim().length > 0);
}

function redact(n: string, visible = 3): string {
  if (!n) return "";
  if (n.length <= visible) return "•".repeat(6);
  return "•".repeat(6) + n.slice(-visible);
}

const postSchema = z.object({
  iyzicoApiKey: z.string().optional(),
  iyzicoSecretKey: z.string().optional(),
  iyzicoBaseUrl: z.string().optional(),
  paytrMerchantId: z.string().optional(),
  paytrMerchantKey: z.string().optional(),
  paytrMerchantSalt: z.string().optional(),
  paytrTestMode: z.boolean().optional(),
  eInvoiceMode: z.enum(["mock", "sovos"]).optional(),
  sovosApiBaseUrl: z.string().optional(),
  sovosApiKey: z.string().optional(),
  sovosApiSecret: z.string().optional(),
});

function jsonDegraded(
  message: string,
  extra?: { connection?: boolean },
) {
  const appUrl = getAppUrl().replace(/\/$/, "");
  return NextResponse.json({
    degraded: true,
    degradedMessage: message,
    appUrl,
    iyzico: {
      baseUrl: "",
      baseUrlOptions: IYZICO_BASE_URL_CHOICES,
      iyzicoApiKeyMasked: "",
      iyzicoSecretKeyMasked: "",
      fromDatabase: { hasApiKey: false, hasSecret: false },
      fromEnv: {
        hasApiKey: hasEnv(process.env.IYZICO_API_KEY),
        hasSecret: hasEnv(process.env.IYZICO_SECRET_KEY),
        hasBaseUrl: hasEnv(process.env.IYZICO_BASE_URL),
      },
      iyzicoCallbackUrl: `${appUrl}/api/payments/iyzico/callback`,
    },
    paytr: {
      merchantId: "",
      testMode: false,
      merchantKeyMasked: "",
      merchantSaltMasked: "",
      fromDatabase: { hasId: false, hasKey: false, hasSalt: false },
      fromEnv: {
        hasId: hasEnv(process.env.PAYTR_MERCHANT_ID),
        hasKey: hasEnv(process.env.PAYTR_MERCHANT_KEY),
        hasSalt: hasEnv(process.env.PAYTR_MERCHANT_SALT),
      },
      paytrCallbackUrl: `${appUrl}/api/payments/paytr/notify`,
    },
    sovos: {
      eInvoiceMode: "mock" as const,
      sovosApiBaseUrl: "",
      sovosApiKeyMasked: "",
      sovosApiSecretMasked: "",
      fromDatabase: { hasBaseUrl: false, hasKey: false, hasSecret: false },
      fromEnv: {
        hasBaseUrl: hasEnv(process.env.SOVOS_API_BASE_URL),
        hasKey: hasEnv(process.env.SOVOS_API_KEY),
        hasSecret: hasEnv(process.env.SOVOS_API_SECRET),
        eInvoiceModeEnv: hasEnv(process.env.EINVOICE_MODE),
      },
    },
    dbConnectionError: extra?.connection === true,
  });
}

export async function GET() {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    const s = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const appUrl = getAppUrl().replace(/\/$/, "");
    const paytrCallbackUrl = `${appUrl}/api/payments/paytr/notify`;
    const iyzicoCallbackUrl = `${appUrl}/api/payments/iyzico/callback`;

    return NextResponse.json({
      degraded: false,
      appUrl,
      iyzico: {
        baseUrl: s.iyzicoBaseUrl || "",
        baseUrlOptions: IYZICO_BASE_URL_CHOICES,
        iyzicoApiKeyMasked: s.iyzicoApiKey ? redact(s.iyzicoApiKey) : "",
        iyzicoSecretKeyMasked: s.iyzicoSecretKey ? redact(s.iyzicoSecretKey) : "",
        fromDatabase: {
          hasApiKey: hasEnv(s.iyzicoApiKey),
          hasSecret: hasEnv(s.iyzicoSecretKey),
        },
        fromEnv: {
          hasApiKey: hasEnv(process.env.IYZICO_API_KEY),
          hasSecret: hasEnv(process.env.IYZICO_SECRET_KEY),
          hasBaseUrl: hasEnv(process.env.IYZICO_BASE_URL),
        },
        iyzicoCallbackUrl,
      },
      paytr: {
        merchantId: s.paytrMerchantId,
        testMode: s.paytrTestMode,
        merchantKeyMasked: s.paytrMerchantKey ? redact(s.paytrMerchantKey) : "",
        merchantSaltMasked: s.paytrMerchantSalt ? redact(s.paytrMerchantSalt) : "",
        fromDatabase: {
          hasId: hasEnv(s.paytrMerchantId),
          hasKey: hasEnv(s.paytrMerchantKey),
          hasSalt: hasEnv(s.paytrMerchantSalt),
        },
        fromEnv: {
          hasId: hasEnv(process.env.PAYTR_MERCHANT_ID),
          hasKey: hasEnv(process.env.PAYTR_MERCHANT_KEY),
          hasSalt: hasEnv(process.env.PAYTR_MERCHANT_SALT),
        },
        paytrCallbackUrl,
      },
      sovos: {
        eInvoiceMode: s.eInvoiceMode === "sovos" ? ("sovos" as const) : ("mock" as const),
        sovosApiBaseUrl: s.sovosApiBaseUrl || "",
        sovosApiKeyMasked: s.sovosApiKey ? redact(s.sovosApiKey) : "",
        sovosApiSecretMasked: s.sovosApiSecret ? redact(s.sovosApiSecret) : "",
        fromDatabase: {
          hasBaseUrl: hasEnv(s.sovosApiBaseUrl),
          hasKey: hasEnv(s.sovosApiKey),
          hasSecret: hasEnv(s.sovosApiSecret),
        },
        fromEnv: {
          hasBaseUrl: hasEnv(process.env.SOVOS_API_BASE_URL),
          hasKey: hasEnv(process.env.SOVOS_API_KEY),
          hasSecret: hasEnv(process.env.SOVOS_API_SECRET),
          eInvoiceModeEnv: hasEnv(process.env.EINVOICE_MODE),
        },
      },
    });
  } catch (e) {
    const isConn = isLikelyDatabaseConnectionError(e);
    if (isConn) {
      return jsonDegraded("Veritabanına ulaşılamıyor. `DATABASE_URL` ve `npm run db:doctor` / `docs/baglanti-sorun-giderme.md`.", {
        connection: true,
      });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (isLikelyPrismaSchemaColumnMissing(e) || /column|does not exist|unknown field|P2021|P2022/i.test(msg)) {
      return jsonDegraded("Veritabanı şeması güncel değil. Proje kökünde: `npm run db:migrate` (AdminSettings ödeme sütunları gerekir).", {});
    }
    console.error("GET /api/admin/payment-providers", e);
    return jsonDegraded("Sunucu hatası. Konsol günlüğüne bakın; `npm run db:migrate` ve `npx prisma generate` deneyin.", {});
  }
}

export async function POST(req: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    const data = postSchema.parse(await req.json());
    const write: Record<string, unknown> = {};

    if (data.iyzicoBaseUrl !== undefined) {
      write.iyzicoBaseUrl = data.iyzicoBaseUrl?.trim() ?? "";
    }
    if (data.iyzicoApiKey !== undefined && data.iyzicoApiKey.trim() !== "") {
      write.iyzicoApiKey = data.iyzicoApiKey.trim();
    }
    if (data.iyzicoSecretKey !== undefined && data.iyzicoSecretKey.trim() !== "") {
      write.iyzicoSecretKey = data.iyzicoSecretKey.trim();
    }
    if (data.paytrMerchantId !== undefined) {
      write.paytrMerchantId = data.paytrMerchantId.trim();
    }
    if (data.paytrMerchantKey !== undefined && data.paytrMerchantKey.trim() !== "") {
      write.paytrMerchantKey = data.paytrMerchantKey.trim();
    }
    if (data.paytrMerchantSalt !== undefined && data.paytrMerchantSalt.trim() !== "") {
      write.paytrMerchantSalt = data.paytrMerchantSalt.trim();
    }
    if (data.paytrTestMode !== undefined) {
      write.paytrTestMode = data.paytrTestMode;
    }
    if (data.eInvoiceMode !== undefined) {
      write.eInvoiceMode = data.eInvoiceMode;
    }
    if (data.sovosApiBaseUrl !== undefined) {
      write.sovosApiBaseUrl = data.sovosApiBaseUrl.trim();
    }
    if (data.sovosApiKey !== undefined && data.sovosApiKey.trim() !== "") {
      write.sovosApiKey = data.sovosApiKey.trim();
    }
    if (data.sovosApiSecret !== undefined && data.sovosApiSecret.trim() !== "") {
      write.sovosApiSecret = data.sovosApiSecret.trim();
    }

    if (Object.keys(write).length === 0) {
      return NextResponse.json({ error: "Guncellenecek alan yok." }, { status: 400 });
    }

    try {
      const updated = await prisma.adminSettings.upsert({
        where: { id: "singleton" },
        update: write,
        create: { id: "singleton", ...write },
      });
      return NextResponse.json({ ok: true, settings: updated });
    } catch (dbErr) {
      if (isLikelyPrismaSchemaColumnMissing(dbErr)) {
        return NextResponse.json(
          {
            error:
              "Veritabanı şeması güncel değil. Proje kökünde `npm run db:migrate` çalıştırın (ödeme sütunları eksik).",
          },
          { status: 503 },
        );
      }
      throw dbErr;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (isLikelyDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: "Veritabanına ulaşılamıyor. DATABASE_URL ve `npm run db:doctor` ile kontrol edin." },
        { status: 503 },
      );
    }
    console.error("payment providers save error", error);
    return NextResponse.json({ error: "Kayit basarisiz." }, { status: 500 });
  }
}
