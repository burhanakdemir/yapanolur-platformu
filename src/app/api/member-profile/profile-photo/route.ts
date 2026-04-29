import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  profilePhotoUrl: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const data = bodySchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { profilePhotoUrl: data.profilePhotoUrl },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Profil fotografi guncellenemedi." }, { status: 500 });
  }
}
