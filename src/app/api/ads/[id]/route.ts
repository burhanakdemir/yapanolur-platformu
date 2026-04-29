import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { normalizeAdTextForStorage } from "@/lib/adTitleDisplay";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(4, "En az 4 karakter"),
});

/**
 * İlan sahibi onay bekleyen veya yayında ilanın proje adını günceller.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Giris yapmalisiniz." }, { status: 401 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    const raw = await req.json();
    body = patchSchema.parse({
      title: normalizeAdTextForStorage(String(raw.title ?? "")),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.issues[0]?.message ?? "Gecersiz veri.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Gecersiz veri." }, { status: 400 });
  }

  const ad = await prisma.ad.findFirst({
    where: {
      id,
      ownerId: session.userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (!ad) {
    return NextResponse.json(
      { error: "Ilan bulunamadi, size ait degil veya duzenlenemez." },
      { status: 404 },
    );
  }

  const updated = await prisma.ad.update({
    where: { id },
    data: { title: body.title },
  });

  return NextResponse.json({ ok: true, title: updated.title });
}
