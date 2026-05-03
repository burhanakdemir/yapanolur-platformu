import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";
import { viewerHasBidOnOwnerApprovedAds } from "@/lib/listingBidderContactAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ userId: string }> };

function contactPayload(target: {
  email: string;
  memberProfile: {
    phone: string | null;
    province: string | null;
    district: string | null;
    billingAccountType: string;
    billingAuthorizedGivenName: string | null;
    billingAuthorizedFamilyName: string | null;
  } | null;
}) {
  const mp = target.memberProfile;
  const authParts = [mp?.billingAuthorizedGivenName?.trim(), mp?.billingAuthorizedFamilyName?.trim()].filter(
    Boolean,
  ) as string[];
  const authorizedPersonName =
    mp?.billingAccountType === "CORPORATE" && authParts.length > 0 ? authParts.join(" ") : null;
  return {
    email: target.email,
    phone: mp?.phone ?? null,
    province: mp?.province ?? null,
    district: mp?.district ?? null,
    authorizedPersonName,
  };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: "Gecersiz uye." }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, role: "MEMBER", isMemberApproved: true },
      select: {
        id: true,
        memberNumber: true,
        name: true,
        profilePhotoUrl: true,
        email: true,
        memberProfile: {
          select: {
            phone: true,
            province: true,
            district: true,
            billingAccountType: true,
            billingAuthorizedGivenName: true,
            billingAuthorizedFamilyName: true,
            profession: { select: { name: true } },
          },
        },
      },
    });

    if (!target?.memberProfile) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const feeEnabled = Boolean(settings.memberContactFeeEnabled);
    const feeTry = Number(settings.memberContactFeeAmountTry ?? 0);
    const requiresPayment = feeEnabled && feeTry > 0;

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);

    const summary = {
      id: target.id,
      memberNumber: target.memberNumber,
      name: target.name,
      profilePhotoUrl: target.profilePhotoUrl,
      professionName: target.memberProfile.profession?.name ?? null,
    };

    const settingsOut = {
      memberContactFeeEnabled: feeEnabled,
      memberContactFeeAmountTry: feeTry,
    };

    if (!session) {
      return NextResponse.json({
        target: summary,
        settings: settingsOut,
        session: null,
        balance: 0,
        access: { hasPaid: false, requiresPayment },
        bypassPayment: false,
        contact: null,
      });
    }

    const balance = await sumUserCreditTry(session.userId);
    const isAdmin = isStaffAdminRole(session.role);
    const isSelf = session.userId === targetUserId;

    if (isAdmin || isSelf) {
      return NextResponse.json({
        target: summary,
        settings: settingsOut,
        session: { userId: session.userId, role: session.role },
        balance,
        access: { hasPaid: true, requiresPayment },
        bypassPayment: true,
        contact: contactPayload(target),
      });
    }

    if (session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Bu islem icin uye hesabi gerekir." },
        { status: 403 },
      );
    }

    const payer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isMemberApproved: true },
    });
    if (!payer?.isMemberApproved) {
      return NextResponse.json({
        target: summary,
        settings: settingsOut,
        session: { userId: session.userId, role: session.role },
        balance,
        access: { hasPaid: false, requiresPayment },
        bypassPayment: false,
        contact: null,
        pendingApproval: true,
      });
    }

    const accessRow = await prisma.memberContactAccess.findUnique({
      where: {
        viewerUserId_targetUserId: { viewerUserId: session.userId, targetUserId },
      },
      select: { id: true, paidAt: true },
    });
    /** Kayıt varsa tek seferlik ödeme yapılmış demektir; paidAt eski veride boş olsa bile erişim kalır. */
    const hasPaidContact = Boolean(accessRow);
    const freeAsListingBidder = await viewerHasBidOnOwnerApprovedAds(
      prisma,
      session.userId,
      targetUserId,
    );
    const hasPaid = hasPaidContact || freeAsListingBidder;

    if (!requiresPayment || hasPaid) {
      return NextResponse.json({
        target: summary,
        settings: settingsOut,
        session: { userId: session.userId, role: session.role },
        balance,
        access: { hasPaid: hasPaid || !requiresPayment, requiresPayment },
        bypassPayment: false,
        freeListingBidderAccess: freeAsListingBidder && !hasPaidContact,
        contact: contactPayload(target),
      });
    }

    return NextResponse.json({
      target: summary,
      settings: settingsOut,
      session: { userId: session.userId, role: session.role },
      balance,
      access: { hasPaid: false, requiresPayment: true },
      bypassPayment: false,
      contact: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/members/[userId]/contact-access]", e);
    return NextResponse.json(
      {
        error: "Erisim bilgisi alinamadi.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 },
    );
  }
}

const postSchema = z.object({ action: z.literal("unlock") });

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId: targetUserId } = await params;
    postSchema.parse(await req.json());

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "Bu islem icin uye hesabi gerekir." }, { status: 403 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, role: "MEMBER", isMemberApproved: true },
      select: { id: true, memberProfile: { select: { id: true } } },
    });
    if (!target?.memberProfile) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }
    if (session.userId === targetUserId) {
      return NextResponse.json({ error: "Kendi iletisiminiz ucretsiz." }, { status: 400 });
    }

    const payer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isMemberApproved: true },
    });
    if (!payer?.isMemberApproved) {
      return NextResponse.json(
        { error: "Uye onayi bekleniyor; odeme icin onayli hesap gerekir." },
        { status: 403 },
      );
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    if (!settings.memberContactFeeEnabled || (settings.memberContactFeeAmountTry ?? 0) <= 0) {
      return NextResponse.json({ error: "Iletisim ucreti aktif degil." }, { status: 400 });
    }

    const fee = settings.memberContactFeeAmountTry ?? 0;
    const existing = await prisma.memberContactAccess.findUnique({
      where: {
        viewerUserId_targetUserId: { viewerUserId: session.userId, targetUserId },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: true, action: "unlock", alreadyPaid: true });
    }
    const freeAsListingBidder = await viewerHasBidOnOwnerApprovedAds(
      prisma,
      session.userId,
      targetUserId,
    );
    if (freeAsListingBidder) {
      return NextResponse.json({
        ok: true,
        action: "unlock",
        alreadyPaid: true,
        freeListingBidderAccess: true,
      });
    }

    const balance = await sumUserCreditTry(session.userId);
    if (balance < fee) {
      return NextResponse.json(
        { error: `Yetersiz bakiye. Gerekli: ${fee} TL, mevcut: ${balance} TL` },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.memberContactAccess.create({
        data: {
          viewerUserId: session.userId,
          targetUserId,
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId: session.userId,
          type: "MEMBER_CONTACT_FEE",
          amountTry: -fee,
          description: `Meslek sahibi iletisim (${targetUserId})`,
          referenceId: targetUserId,
        },
      });
    });

    return NextResponse.json({ ok: true, action: "unlock" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[POST /api/members/[userId]/contact-access]", error);
    return NextResponse.json({ error: "Odeme yapilamadi." }, { status: 500 });
  }
}
