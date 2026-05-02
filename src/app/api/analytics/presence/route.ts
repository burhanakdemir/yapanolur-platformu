import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitGuard } from "@/lib/rateLimit";
import {
  SITE_VISITOR_COOKIE,
  isLikelyAutomatedUserAgent,
  newVisitorKey,
  normalizeVisitorKey,
} from "@/lib/siteAnalytics";
import { istYmdNow } from "@/lib/executive/istanbulCalendar";

export async function POST(req: Request) {
  const rl = await rateLimitGuard(req, "sitePresence");
  if (rl) return rl;

  const ua = req.headers.get("user-agent");
  if (isLikelyAutomatedUserAgent(ua)) {
    return new NextResponse(null, { status: 204 });
  }

  const c = await cookies();
  const existing = normalizeVisitorKey(c.get(SITE_VISITOR_COOKIE)?.value);
  const visitorKey = existing ?? newVisitorKey();
  const dayYmd = istYmdNow();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.siteVisitorPresence.upsert({
        where: { visitorKey },
        create: { visitorKey, lastSeenAt: new Date() },
        update: { lastSeenAt: new Date() },
      });

      const inserted = await tx.siteVisitorDayDedup.createMany({
        data: [{ visitorKey, dayYmd }],
        skipDuplicates: true,
      });

      if (inserted.count > 0) {
        await tx.siteVisitDaily.upsert({
          where: { dayYmd },
          create: { dayYmd, uniqueVisitors: 1 },
          update: { uniqueVisitors: { increment: 1 } },
        });
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "analytics_unavailable" }, { status: 503 });
  }

  const secure = process.env.NODE_ENV === "production";
  const cookieParts = [
    `${SITE_VISITOR_COOKIE}=${visitorKey}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
    "HttpOnly",
    ...(secure ? ["Secure"] : []),
  ];
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieParts.join("; "));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** OPTIONS bazı ortamlarda preflight için */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
