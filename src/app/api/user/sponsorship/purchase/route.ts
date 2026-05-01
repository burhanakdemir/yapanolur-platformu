import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { verifySessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import {
  isSponsorHeroDurationDays,
  mergeSponsorHeroPricingFromDb,
} from "@/lib/sponsorHeroPricing";
import { DatabaseUrlSanityError } from "@/lib/databaseUrlSanity";
import {
  collectErrorChainText,
  isLikelyDatabaseConnectionError,
  isLikelyPrismaSchemaColumnMissing,
} from "@/lib/dbErrors";
import { sumUserCreditTry } from "@/lib/userCredit";

const bodySchema = z.object({
  periodDays: z.number().int().refine((n) => isSponsorHeroDurationDays(n), {
    message: "Geçerli süre paketi seçin (4, 7, 10, 15 veya 30 gün).",
  }),
});

async function sumCreditTryInTx(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const agg = await tx.creditTransaction.aggregate({
    where: { userId },
    _sum: { amountTry: true },
  });
  return agg._sum.amountTry ?? 0;
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "Bu işlem yalnızca üye hesabı içindir." }, { status: 403 });
    }

    const payer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isMemberApproved: true },
    });
    if (!payer?.isMemberApproved) {
      return NextResponse.json(
        { error: "Üyelik onayı bekleniyor; bakiye kullanımı için onaylı hesap gerekir." },
        { status: 403 },
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçerli süre paketi gönderin." }, { status: 400 });
    }

    const { periodDays } = parsed.data;

    const settings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      return NextResponse.json({ error: "Platform ayarları yüklenemedi." }, { status: 503 });
    }

    const pricing = mergeSponsorHeroPricingFromDb(settings);
    const key = String(periodDays) as keyof typeof pricing;
    const fee = Math.max(0, Math.trunc(pricing[key] ?? 0));

    const dupPending = await prisma.sponsorHeroPurchaseRequest.findFirst({
      where: { userId: session.userId, status: "PENDING" },
      select: { id: true },
    });
    if (dupPending) {
      return NextResponse.json(
        {
          error:
            "Zaten onay bekleyen bir sponsorluk başvurunuz var. Sonuçlandıktan sonra yeniden başvurabilirsiniz.",
          duplicatePending: true,
        },
        { status: 409 },
      );
    }

    try {
      const out = await prisma.$transaction(async (tx) => {
        const dupInTx = await tx.sponsorHeroPurchaseRequest.findFirst({
          where: { userId: session.userId, status: "PENDING" },
          select: { id: true },
        });
        if (dupInTx) {
          throw Object.assign(new Error("duplicate_pending"), { code: "DUPLICATE_PENDING" });
        }

        if (fee <= 0) {
          await tx.sponsorHeroPurchaseRequest.create({
            data: {
              userId: session.userId,
              periodDays,
              amountTryPaid: 0,
              status: "PENDING",
            },
          });
          return { feeTry: 0, pendingApproval: true };
        }

        const balanceInTx = await sumCreditTryInTx(tx, session.userId);
        if (balanceInTx < fee) {
          throw Object.assign(new Error("insufficient_balance"), {
            code: "INSUFFICIENT",
            balanceTry: balanceInTx,
            requiredTry: fee,
          });
        }

        const debit = await tx.creditTransaction.create({
          data: {
            userId: session.userId,
            type: "SPONSOR_HERO_FEE",
            amountTry: -fee,
            description: `Ana sayfa sponsorluğu (${periodDays} gün) — onay bekliyor`,
            referenceId: String(periodDays),
          },
        });

        await tx.sponsorHeroPurchaseRequest.create({
          data: {
            userId: session.userId,
            periodDays,
            amountTryPaid: fee,
            status: "PENDING",
            paymentCreditTxId: debit.id,
          },
        });

        return { feeTry: fee, pendingApproval: true };
      });

      const balanceAfter = await sumUserCreditTry(session.userId);

      return NextResponse.json({
        ok: true,
        periodDays,
        feeTry: out.feeTry,
        balanceTry: balanceAfter,
        pendingApproval: out.pendingApproval,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; balanceTry?: number; requiredTry?: number };
      if (err.code === "DUPLICATE_PENDING") {
        return NextResponse.json(
          {
            error:
              "Zaten onay bekleyen bir sponsorluk başvurunuz var. Sonuçlandıktan sonra yeniden başvurabilirsiniz.",
            duplicatePending: true,
          },
          { status: 409 },
        );
      }
      if (err.code === "INSUFFICIENT") {
        return NextResponse.json(
          {
            error: `Yetersiz bakiye. Gerekli: ${err.requiredTry} TL, mevcut: ${err.balanceTry} TL.`,
            needTopup: true,
            balanceTry: err.balanceTry,
            requiredTry: err.requiredTry,
            periodDays,
          },
          { status: 400 },
        );
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof DatabaseUrlSanityError) {
      return NextResponse.json(
        {
          error:
            "Veritabanı adresi geçersiz veya örnek URL kalmış. `.env` içindeki DATABASE_URL değerini düzeltin (docs/local-db.md).",
          details: e.message.slice(0, 1200),
        },
        { status: 503 },
      );
    }
    if (isLikelyDatabaseConnectionError(e)) {
      return NextResponse.json(
        {
          error:
            "Veritabanına bağlanılamıyor. PostgreSQL çalışıyor mu ve DATABASE_URL doğru mu? `npm run db:doctor` — docs/local-db.md.",
          details:
            process.env.NODE_ENV === "development" ? collectErrorChainText(e).slice(0, 1200) : undefined,
        },
        { status: 503 },
      );
    }
    if (isLikelyPrismaSchemaColumnMissing(e)) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması güncel değil (sponsor başvuru tablosu veya kolon eksik). Sunucuda veya yerelde: `npx prisma migrate deploy` ve `npx prisma generate`; geliştirme için docs/local-db.md.",
          details: collectErrorChainText(e).slice(0, 1200),
        },
        { status: 503 },
      );
    }
    console.error("[POST /api/user/sponsorship/purchase]", e);
    return NextResponse.json(
      {
        error: "İşlem tamamlanamadı.",
        details: process.env.NODE_ENV === "development" ? collectErrorChainText(e) : undefined,
      },
      { status: 500 },
    );
  }
}
