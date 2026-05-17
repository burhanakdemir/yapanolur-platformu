import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import { verifyPassword } from "@/lib/passwordHash";

const bodySchema = z.object({
  currentPassword: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1),
  ),
});

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const limited = await rateLimitGuard(req, "passwordChange", { userId: session.userId });
    if (limited) return limited;

    const data = bodySchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, password: true },
    });
    if (!user || user.role !== "MEMBER") {
      return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
    }
    if (!(await verifyPassword(data.currentPassword, user.password))) {
      return NextResponse.json({ error: "Mevcut şifre hatalı." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Doğrulama yapılamadı." }, { status: 500 });
  }
}
