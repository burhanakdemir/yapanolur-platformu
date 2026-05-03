import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserNewAdEmailOptIn, setUserNewAdEmailOptIn } from "@/lib/userNewAdEmailOptIn";

const patchSchema = z.object({
  newAdEmailOptIn: z.boolean(),
});

export async function GET() {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      memberNumber: true,
      email: true,
      name: true,
      profilePhotoUrl: true,
      role: true,
      memberProfile: {
        select: {
          phone: true,
          province: true,
          district: true,
          professionId: true,
          profession: { select: { id: true, name: true } },
          billingAccountType: true,
          billingTcKimlik: true,
          billingCompanyTitle: true,
          billingTaxOffice: true,
          billingVkn: true,
          billingAddressLine: true,
          billingPostalCode: true,
          billingContactSameAsInvoice: true,
          billingContactTcKimlik: true,
          billingContactAddressLine: true,
          billingContactPostalCode: true,
          documents: {
            select: { id: true, type: true, fileUrl: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user || user.role !== "MEMBER" || !user.memberProfile) {
    return NextResponse.json({ exists: false });
  }

  const newAdEmailOptIn = await getUserNewAdEmailOptIn(user.id);

  return NextResponse.json({
    exists: true,
    profile: { ...user, newAdEmailOptIn },
  });
}

export async function PATCH(req: Request) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }
  if (session.role !== "MEMBER") {
    return NextResponse.json({ error: "Yalnizca uyeler icin." }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await req.json());
    try {
      await setUserNewAdEmailOptIn(session.userId, body.newAdEmailOptIn);
    } catch (dbErr) {
      console.error("[PATCH /api/member-profile] newAdEmailOptIn", dbErr);
      return NextResponse.json(
        {
          error:
            "Bildirim tercihi kaydedilemedi. Veritabanında gerekli sütun yok olabilir: `npx prisma migrate deploy` ve `npx prisma generate` çalıştırın.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, newAdEmailOptIn: body.newAdEmailOptIn });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[PATCH /api/member-profile]", error);
    return NextResponse.json({ error: "Guncellenemedi." }, { status: 500 });
  }
}
