import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isSuperAdminRole } from "@/lib/adminRoles";
import { getSiteAnalyticsActiveMs } from "@/lib/siteAnalytics";

export async function GET() {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isSuperAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const activeMs = getSiteAnalyticsActiveMs();
  const since = new Date(Date.now() - activeMs);

  try {
    const [liveVisitors, totalMemberAccounts] = await Promise.all([
      prisma.siteVisitorPresence.count({
        where: { lastSeenAt: { gte: since } },
      }),
      prisma.user.count({ where: { role: "MEMBER" } }),
    ]);

    return NextResponse.json({
      liveVisitors,
      totalMemberAccounts,
      activeWindowMs: activeMs,
    });
  } catch {
    try {
      const totalMemberAccounts = await prisma.user.count({ where: { role: "MEMBER" } });
      return NextResponse.json({
        liveVisitors: 0,
        totalMemberAccounts,
        activeWindowMs: activeMs,
        analyticsUnavailable: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Ölçümler yüklenemedi.", liveVisitors: 0, totalMemberAccounts: 0, activeWindowMs: activeMs },
        { status: 503 },
      );
    }
  }
}
