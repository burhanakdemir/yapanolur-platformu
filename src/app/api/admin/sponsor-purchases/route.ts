import { NextResponse } from "next/server";
import { listPendingSponsorPurchaseRequests } from "@/lib/adminPendingSponsorPurchases";
import { canStaffAdminOrGateAdmin } from "@/lib/adminStaffOrGateAuth";
import { getPrismaClient } from "@/lib/prisma";
import { DatabaseUrlSanityError } from "@/lib/databaseUrlSanity";
import {
  collectErrorChainText,
  isLikelyDatabaseConnectionError,
  isLikelyPrismaSchemaColumnMissing,
} from "@/lib/dbErrors";

export async function GET() {
  try {
    if (!(await canStaffAdminOrGateAdmin())) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const prisma = getPrismaClient();
    const rows = await listPendingSponsorPurchaseRequests(prisma);

    return NextResponse.json({ requests: rows });
  } catch (e) {
    const chain = collectErrorChainText(e);
    if (e instanceof DatabaseUrlSanityError) {
      return NextResponse.json(
        {
          error: "DATABASE_URL yapılandırması geçersiz veya örnek URL kalmış. docs/local-db.md",
          details: process.env.NODE_ENV === "development" ? e.message.slice(0, 1200) : undefined,
        },
        { status: 503 },
      );
    }
    if (isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        {
          error: "Veritabanına bağlanılamıyor. `npm run db:doctor` ve DATABASE_URL kontrolü.",
          details: process.env.NODE_ENV === "development" ? chain.slice(0, 1200) : undefined,
        },
        { status: 503 },
      );
    }
    if (isLikelyPrismaSchemaColumnMissing(e)) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması güncel değil. Sunucuda `npx prisma migrate deploy` ve `npx prisma generate` çalıştırın.",
          details: process.env.NODE_ENV === "development" ? chain : undefined,
        },
        { status: 503 },
      );
    }
    console.error("[GET /api/admin/sponsor-purchases]", e);
    return NextResponse.json({ error: "Liste alınamadı." }, { status: 500 });
  }
}
