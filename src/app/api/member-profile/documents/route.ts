import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  diploma: z.string().min(1).optional(),
  engineeringServiceCertificate: z.string().min(1).optional(),
  taxCertificate: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const data = bodySchema.parse(await req.json());
    if (!data.diploma && !data.engineeringServiceCertificate && !data.taxCertificate) {
      return NextResponse.json({ error: "En az bir belge secin." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, memberProfile: { select: { id: true } } },
    });
    if (!user || user.role !== "MEMBER" || !user.memberProfile) {
      return NextResponse.json({ error: "Uye profili bulunamadi." }, { status: 404 });
    }

    if (data.diploma) {
      await prisma.memberDocument.upsert({
        where: { memberId_type: { memberId: user.memberProfile.id, type: "DIPLOMA" } },
        update: { fileUrl: data.diploma },
        create: { memberId: user.memberProfile.id, type: "DIPLOMA", fileUrl: data.diploma },
      });
    }

    if (data.engineeringServiceCertificate) {
      await prisma.memberDocument.upsert({
        where: {
          memberId_type: { memberId: user.memberProfile.id, type: "ENGINEERING_SERVICE_CERTIFICATE" },
        },
        update: { fileUrl: data.engineeringServiceCertificate },
        create: {
          memberId: user.memberProfile.id,
          type: "ENGINEERING_SERVICE_CERTIFICATE",
          fileUrl: data.engineeringServiceCertificate,
        },
      });
    }

    if (data.taxCertificate) {
      await prisma.memberDocument.upsert({
        where: { memberId_type: { memberId: user.memberProfile.id, type: "TAX_CERTIFICATE" } },
        update: { fileUrl: data.taxCertificate },
        create: { memberId: user.memberProfile.id, type: "TAX_CERTIFICATE", fileUrl: data.taxCertificate },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Belgeler kaydedilemedi." }, { status: 500 });
  }
}
