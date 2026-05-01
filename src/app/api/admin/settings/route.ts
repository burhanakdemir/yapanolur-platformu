import { cookies } from "next/headers";
import { Prisma, type AdminSettings } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { collectErrorChainText, isLikelyPrismaSchemaColumnMissing } from "@/lib/dbErrors";
import { prisma } from "@/lib/prisma";

function hasEnvSmtp() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function hasEnvSmtpPassOnly() {
  return Boolean(process.env.SMTP_PASS?.trim());
}

/** İstemciye şifre gönderilmez. */
function toPublicAdminSettings(s: AdminSettings) {
  /** Panel host+kullanici + (DB sifre veya .env SMTP_PASS) — resolveSmtpConfig ile uyumlu. */
  const panelSmtp =
    Boolean(s.smtpHost?.trim()) &&
    Boolean(s.smtpUser?.trim()) &&
    (Boolean(s.smtpPass?.trim()) || hasEnvSmtpPassOnly());
  return {
    ...s,
    smtpPass: "",
    smtpPassConfigured: panelSmtp,
    smtpReady: panelSmtp || hasEnvSmtp(),
    sovosApiKey: "",
    sovosApiSecret: "",
    sovosApiKeyConfigured: Boolean(s.sovosApiKey?.trim()),
    sovosApiSecretConfigured: Boolean(s.sovosApiSecret?.trim()),
  };
}

function strIn(v: string | null | undefined): string {
  return v == null ? "" : v;
}

function toInt(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  const t = Math.trunc(Number(v));
  return Number.isFinite(t) ? t : undefined;
}

const bodySchema = z.object({
  bidFeeEnabled: z.boolean().optional(),
  bidFeeAmountTry: z.number().int().min(0).optional(),
  detailViewFeeEnabled: z.boolean().optional(),
  detailViewFeeAmountTry: z.number().int().min(0).optional(),
  bidAccessFeeEnabled: z.boolean().optional(),
  bidAccessFeeAmountTry: z.number().int().min(0).optional(),
  memberContactFeeEnabled: z.boolean().optional(),
  memberContactFeeAmountTry: z.number().int().min(0).optional(),
  memberCommentFeeEnabled: z.boolean().optional(),
  memberCommentFeeAmountTry: z.number().int().min(0).optional(),
  showcaseFeeAmountTry: z.number().int().min(0).optional(),
  showcaseDailyPricing: z.record(z.string(), z.number().int().min(0)).optional(),
  homeHeroTitleTr: z.string().optional(),
  homeHeroSubtitleTr: z.string().optional(),
  homeHeroTitleEn: z.string().optional(),
  homeHeroSubtitleEn: z.string().optional(),
  homeTaglineTr: z.string().optional(),
  homeTaglineEn: z.string().optional(),
  homePrimaryButtonTr: z.string().optional(),
  homePrimaryButtonEn: z.string().optional(),
  homeSecondaryButtonTr: z.string().optional(),
  homeSecondaryButtonEn: z.string().optional(),
  homeFooterContact: z.string().optional(),
  newAdEmailAutoEnabled: z.preprocess(
    (v) => {
      if (v === "true" || v === "1" || v === 1 || v === true) return true;
      if (v === "false" || v === "0" || v === 0 || v === false) return false;
      return v;
    },
    z.boolean().optional(),
  ),
  newAdEmailWebhookEnabled: z.preprocess(
    (v) => {
      if (v === "true" || v === "1" || v === 1 || v === true) return true;
      if (v === "false" || v === "0" || v === 0 || v === false) return false;
      return v;
    },
    z.boolean().optional(),
  ),
  newAdEmailFromAddress: z.string().optional().nullable(),
  newAdEmailWebhookUrlsJson: z.string().optional().nullable(),
  newAdEmailWebhookSecret: z.string().optional().nullable(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 && n <= 65535 ? n : 587;
    },
    z.number().int().min(1).max(65535).optional(),
  ),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpSecure: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      return v === "true" || v === "1" || v === true || v === 1;
    },
    z.boolean().optional(),
  ),
  signupEmailVerificationRequired: z.preprocess(
    (v) => {
      if (v === "true" || v === "1" || v === 1 || v === true) return true;
      if (v === "false" || v === "0" || v === 0 || v === false) return false;
      return v;
    },
    z.boolean().optional(),
  ),
  signupPhoneVerificationRequired: z.preprocess(
    (v) => {
      if (v === "true" || v === "1" || v === 1 || v === true) return true;
      if (v === "false" || v === "0" || v === 0 || v === false) return false;
      return v;
    },
    z.boolean().optional(),
  ),
  sponsorHeroFeeAmountTry: z.number().int().min(0).optional(),
  sponsorHeroPeriodDays: z.number().int().min(1).max(3650).optional(),
});

type Body = z.infer<typeof bodySchema>;

/** `Record` yerine Prisma'nın beklediği tipler. */
function buildAdminSettingsUpdateInput(
  data: Body,
  extra: { showcaseDailyPricingJson?: string; setSmtpPass?: string },
): Prisma.AdminSettingsUpdateInput {
  const p: Prisma.AdminSettingsUpdateInput = {};
  if (data.bidFeeEnabled !== undefined) p.bidFeeEnabled = data.bidFeeEnabled;
  if (data.bidFeeAmountTry !== undefined) p.bidFeeAmountTry = toInt(data.bidFeeAmountTry) ?? data.bidFeeAmountTry;
  if (data.detailViewFeeEnabled !== undefined) p.detailViewFeeEnabled = data.detailViewFeeEnabled;
  if (data.detailViewFeeAmountTry !== undefined) {
    p.detailViewFeeAmountTry = toInt(data.detailViewFeeAmountTry) ?? data.detailViewFeeAmountTry;
  }
  if (data.bidAccessFeeEnabled !== undefined) p.bidAccessFeeEnabled = data.bidAccessFeeEnabled;
  if (data.bidAccessFeeAmountTry !== undefined) {
    p.bidAccessFeeAmountTry = toInt(data.bidAccessFeeAmountTry) ?? data.bidAccessFeeAmountTry;
  }
  if (data.memberContactFeeEnabled !== undefined) p.memberContactFeeEnabled = data.memberContactFeeEnabled;
  if (data.memberContactFeeAmountTry !== undefined) {
    p.memberContactFeeAmountTry = toInt(data.memberContactFeeAmountTry) ?? data.memberContactFeeAmountTry;
  }
  if (data.memberCommentFeeEnabled !== undefined) p.memberCommentFeeEnabled = data.memberCommentFeeEnabled;
  if (data.memberCommentFeeAmountTry !== undefined) {
    p.memberCommentFeeAmountTry = toInt(data.memberCommentFeeAmountTry) ?? data.memberCommentFeeAmountTry;
  }
  if (data.showcaseFeeAmountTry !== undefined) {
    p.showcaseFeeAmountTry = toInt(data.showcaseFeeAmountTry) ?? data.showcaseFeeAmountTry;
  }
  if (extra.showcaseDailyPricingJson !== undefined) p.showcaseDailyPricingJson = extra.showcaseDailyPricingJson;
  if (data.homeHeroTitleTr !== undefined) p.homeHeroTitleTr = strIn(data.homeHeroTitleTr);
  if (data.homeHeroSubtitleTr !== undefined) p.homeHeroSubtitleTr = strIn(data.homeHeroSubtitleTr);
  if (data.homeHeroTitleEn !== undefined) p.homeHeroTitleEn = strIn(data.homeHeroTitleEn);
  if (data.homeHeroSubtitleEn !== undefined) p.homeHeroSubtitleEn = strIn(data.homeHeroSubtitleEn);
  if (data.homeTaglineTr !== undefined) p.homeTaglineTr = strIn(data.homeTaglineTr);
  if (data.homeTaglineEn !== undefined) p.homeTaglineEn = strIn(data.homeTaglineEn);
  if (data.homePrimaryButtonTr !== undefined) p.homePrimaryButtonTr = strIn(data.homePrimaryButtonTr);
  if (data.homePrimaryButtonEn !== undefined) p.homePrimaryButtonEn = strIn(data.homePrimaryButtonEn);
  if (data.homeSecondaryButtonTr !== undefined) p.homeSecondaryButtonTr = strIn(data.homeSecondaryButtonTr);
  if (data.homeSecondaryButtonEn !== undefined) p.homeSecondaryButtonEn = strIn(data.homeSecondaryButtonEn);
  if (data.homeFooterContact !== undefined) p.homeFooterContact = strIn(data.homeFooterContact);
  if (data.newAdEmailAutoEnabled !== undefined) p.newAdEmailAutoEnabled = data.newAdEmailAutoEnabled;
  if (data.newAdEmailWebhookEnabled !== undefined) p.newAdEmailWebhookEnabled = data.newAdEmailWebhookEnabled;
  if (data.newAdEmailFromAddress !== undefined) p.newAdEmailFromAddress = strIn(data.newAdEmailFromAddress);
  if (data.newAdEmailWebhookUrlsJson !== undefined) {
    p.newAdEmailWebhookUrlsJson = strIn(data.newAdEmailWebhookUrlsJson) || "[]";
  }
  if (data.newAdEmailWebhookSecret !== undefined) p.newAdEmailWebhookSecret = strIn(data.newAdEmailWebhookSecret);
  if (data.smtpHost !== undefined) p.smtpHost = strIn(data.smtpHost);
  if (data.smtpPort !== undefined) p.smtpPort = toInt(data.smtpPort) ?? data.smtpPort;
  if (data.smtpUser !== undefined) p.smtpUser = strIn(data.smtpUser);
  if (data.smtpSecure !== undefined) p.smtpSecure = data.smtpSecure;
  if (data.signupEmailVerificationRequired !== undefined) {
    p.signupEmailVerificationRequired = data.signupEmailVerificationRequired;
  }
  if (data.signupPhoneVerificationRequired !== undefined) {
    p.signupPhoneVerificationRequired = data.signupPhoneVerificationRequired;
  }
  if (data.sponsorHeroFeeAmountTry !== undefined) {
    p.sponsorHeroFeeAmountTry = toInt(data.sponsorHeroFeeAmountTry) ?? data.sponsorHeroFeeAmountTry;
  }
  if (data.sponsorHeroPeriodDays !== undefined) {
    p.sponsorHeroPeriodDays = toInt(data.sponsorHeroPeriodDays) ?? data.sponsorHeroPeriodDays;
  }
  if (extra.setSmtpPass !== undefined) p.smtpPass = extra.setSmtpPass;
  return p;
}

export async function GET() {
  const settings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json(toPublicAdminSettings(settings));
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const c = await cookies();
    const session = await verifySessionToken(c.get("session_token")?.value);
    if (
      typeof json === "object" &&
      json !== null &&
      ("signupEmailVerificationRequired" in json || "signupPhoneVerificationRequired" in json)
    ) {
      if (!isSuperAdminRole(session?.role)) {
        return NextResponse.json(
          { error: "Üye kaydı doğrulama anahtarlarını yalnızca süper yönetici değiştirebilir." },
          { status: 403 },
        );
      }
    }
    if (
      typeof json === "object" &&
      json !== null &&
      ("sponsorHeroFeeAmountTry" in json || "sponsorHeroPeriodDays" in json)
    ) {
      if (!isSuperAdminRole(session?.role)) {
        return NextResponse.json(
          { error: "Ana sayfa sponsor ücretini yalnızca süper yönetici değiştirebilir." },
          { status: 403 },
        );
      }
    }
    const data = bodySchema.parse(json);
    const showcaseDailyPricingJson =
      data.showcaseDailyPricing !== undefined ? JSON.stringify(data.showcaseDailyPricing) : undefined;
    const smtpPassToSet =
      data.smtpPass != null && typeof data.smtpPass === "string" && data.smtpPass.trim().length > 0
        ? data.smtpPass.trim()
        : undefined;

    const updateData = buildAdminSettingsUpdateInput(data, {
      showcaseDailyPricingJson,
      setSmtpPass: smtpPassToSet,
    });

    if (Object.keys(updateData).length === 0) {
      if (smtpPassToSet) {
        const updated = await prisma.adminSettings.upsert({
          where: { id: "singleton" },
          update: { smtpPass: smtpPassToSet },
          create: { id: "singleton", smtpPass: smtpPassToSet } as Prisma.AdminSettingsCreateInput,
        });
        return NextResponse.json({ ok: true, settings: toPublicAdminSettings(updated) });
      }
      const current = await prisma.adminSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      return NextResponse.json({ ok: true, settings: toPublicAdminSettings(current) });
    }

    const updated = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: { id: "singleton", ...updateData } as Prisma.AdminSettingsCreateInput,
    });
    return NextResponse.json({ ok: true, settings: toPublicAdminSettings(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Gecerli degerler gonderin.", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("admin settings validation", error.message);
      return NextResponse.json(
        {
          error:
            "Gonderilen alanlardan biri veritabani/Prisma beklentisiyle uyuşmadi. Sema: `npx prisma migrate deploy` + `npx prisma generate` ve sunucuyu yeniden calistirin.",
          details: error.message,
        },
        { status: 400 },
      );
    }
    const chain = collectErrorChainText(error);
    console.error("admin settings save error", error);
    if (isLikelyPrismaSchemaColumnMissing(error)) {
      return NextResponse.json(
        {
          error:
            "Veritabanı şeması güncel değil. Sunucuda `npx prisma migrate deploy` ve `npx prisma generate` çalıştırın.",
          details: process.env.NODE_ENV === "development" ? chain : undefined,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error: "Ayarlar kaydedilemedi.",
        details: process.env.NODE_ENV === "development" ? chain : undefined,
      },
      { status: 500 },
    );
  }
}
