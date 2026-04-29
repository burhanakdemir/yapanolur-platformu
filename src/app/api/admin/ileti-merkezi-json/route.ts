import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";
import { isLikelyDatabaseConnectionError, isLikelyPrismaSchemaColumnMissing } from "@/lib/dbErrors";
import { normalizePhoneInputToE164 } from "@/lib/intlPhone";
import { sendIletiMerkeziJsonSms } from "@/lib/iletMerkeziJsonSms";

export const dynamic = "force-dynamic";

function redact(n: string, visible = 3): string {
  if (!n) return "";
  if (n.length <= visible) return "•".repeat(6);
  return "•".repeat(6) + n.slice(-visible);
}

/** `AdminSettings` satırı yoksa oluşturur (yalnız `id`; diğer sütunlar DB varsayılanları). */
async function ensureAdminSettingsSingletonRow(): Promise<void> {
  await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

/**
 * Eski Prisma Client `iletiMerkezi*` sütunlarını modelde bilmeyebilir; SELECT listesine alınmaz.
 * Ham SQL ile okunur — migration uygulandıysa panel değerleri her zaman dolar.
 */
async function readIletiMerkeziPanelColumnStrings(): Promise<{
  user: string;
  pass: string | null;
  sender: string;
}> {
  const rows = await prisma.$queryRaw<Array<{ u: string | null; p: string | null; s: string | null }>>`
    SELECT "iletiMerkeziUser" AS u, "iletiMerkeziPass" AS p, "iletiMerkeziSender" AS s
    FROM "AdminSettings" WHERE "id" = 'singleton' LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { user: "", pass: null, sender: "" };
  return {
    user: row.u ?? "",
    pass: row.p,
    sender: row.s ?? "",
  };
}

function rawAffectedCount(n: number | bigint): number {
  return typeof n === "bigint" ? Number(n) : n;
}

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

const postSchema = z.object({
  iletiMerkeziUser: z.string().optional(),
  iletiMerkeziPass: z.string().optional(),
  iletiMerkeziSender: z.string().optional(),
});

export async function GET() {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    await ensureAdminSettingsSingletonRow();
    const ileti = await readIletiMerkeziPanelColumnStrings();
    return NextResponse.json({
      iletiMerkeziUser: ileti.user,
      iletiMerkeziPassMasked: ileti.pass ? redact(ileti.pass) : "",
      hasIletiMerkeziPass: Boolean(ileti.pass?.trim()),
      iletiMerkeziSender: ileti.sender,
      envUserSet: Boolean(process.env.ILETI_MERKEZI_USER?.trim()),
      envPassSet: Boolean(process.env.ILETI_MERKEZI_PASS?.trim()),
      envSenderSet: Boolean(process.env.ILETI_MERKEZI_SENDER?.trim()),
      hint: "Panelde üç alan da doluysa kod panelden okunur; eksikse ILETI_MERKEZI_USER, ILETI_MERKEZI_PASS, ILETI_MERKEZI_SENDER env kullanılır.",
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
    console.error("GET /api/admin/ileti-merkezi-json", e);
    return NextResponse.json({ error: "Ayarlar okunamadı." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "İstek gövdesi geçerli JSON değil." }, { status: 400 });
    }
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;
    const write: Record<string, unknown> = {};
    if (data.iletiMerkeziUser !== undefined) write.iletiMerkeziUser = data.iletiMerkeziUser.trim();
    if (data.iletiMerkeziPass !== undefined && data.iletiMerkeziPass.trim() !== "") {
      write.iletiMerkeziPass = data.iletiMerkeziPass.trim();
    }
    if (data.iletiMerkeziSender !== undefined) write.iletiMerkeziSender = data.iletiMerkeziSender.trim();

    if (Object.keys(write).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
    }

    /**
     * Prisma Client eski şemayla üretilmişse `upsert({ create: { iletiMerkeziUser: ... } })` "Unknown argument" verir.
     * Sütunlar DB’de varsa (migration uygulandıysa) doğrudan SQL ile yazar; client sürümünden bağımsızdır.
     */
    await ensureAdminSettingsSingletonRow();
    const user = String(write.iletiMerkeziUser ?? "");
    const sender = String(write.iletiMerkeziSender ?? "");
    const passProvided = write.iletiMerkeziPass !== undefined;
    const pass = passProvided ? String(write.iletiMerkeziPass) : null;

    let affected: number;
    if (passProvided && pass !== null) {
      affected = await prisma.$executeRaw`
        UPDATE "AdminSettings"
        SET
          "iletiMerkeziUser" = ${user},
          "iletiMerkeziPass" = ${pass},
          "iletiMerkeziSender" = ${sender},
          "updatedAt" = NOW()
        WHERE "id" = 'singleton'
      `;
    } else {
      affected = await prisma.$executeRaw`
        UPDATE "AdminSettings"
        SET
          "iletiMerkeziUser" = ${user},
          "iletiMerkeziSender" = ${sender},
          "updatedAt" = NOW()
        WHERE "id" = 'singleton'
      `;
    }
    if (rawAffectedCount(affected) === 0) {
      await ensureAdminSettingsSingletonRow();
      if (passProvided && pass !== null) {
        await prisma.$executeRaw`
          UPDATE "AdminSettings"
          SET
            "iletiMerkeziUser" = ${user},
            "iletiMerkeziPass" = ${pass},
            "iletiMerkeziSender" = ${sender},
            "updatedAt" = NOW()
          WHERE "id" = 'singleton'
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "AdminSettings"
          SET
            "iletiMerkeziUser" = ${user},
            "iletiMerkeziSender" = ${sender},
            "updatedAt" = NOW()
          WHERE "id" = 'singleton'
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/ileti-merkezi-json", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (isLikelyDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: "Veritabanına ulaşılamıyor. DATABASE_URL ile kontrol edin." },
        { status: 503 },
      );
    }
    if (isLikelyPrismaSchemaColumnMissing(error) || /column|does not exist|Unknown field|P2022/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması bu sürümle uyumlu değil (iletiMerkezi* sütunları eksik olabilir). Proje kökünde `npm run db:migrate` çalıştırıp uygulamayı yeniden başlatın.",
        },
        { status: 503 },
      );
    }
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? msg
          : "Kayıt başarısız. Sunucu günlüğünü kontrol edin; çoğunlukla `npm run db:migrate` ile migration eksiktir.",
        ...(isDev ? {} : { detail: msg }),
      },
      { status: 500 },
    );
  }
}

const testBodySchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1).max(1000),
});

export async function PUT(req: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  try {
    const { phone, message } = testBodySchema.parse(await req.json());
    const e164 = normalizePhoneInputToE164(phone.trim());
    if (!e164) {
      return NextResponse.json({ error: "Geçerli bir telefon numarası girin (E.164 veya 05xx…)." }, { status: 400 });
    }
    await sendIletiMerkeziJsonSms(e164, message, { prisma });
    return NextResponse.json({ ok: true, message: "SMS isteği İleti Merkezi’ne iletildi." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Gönderim başarısız.";
    console.error("PUT /api/admin/ileti-merkezi-json", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
