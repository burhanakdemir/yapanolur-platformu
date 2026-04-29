import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDashboardRange, getRangeStart } from "@/lib/date-range";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export async function GET(req: Request) {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const url = new URL(req.url);
  const range = getDashboardRange(url.searchParams.get("range") || undefined);
  const since = getRangeStart(range);

  const [pendingAds, bidCount, paidOrders] = await Promise.all([
    prisma.ad.count({ where: { status: "PENDING", createdAt: { gte: since } } }),
    prisma.bid.count({ where: { createdAt: { gte: since } } }),
    prisma.paymentOrder.count({ where: { status: "PAID", createdAt: { gte: since } } }),
  ]);

  return NextResponse.json({ pendingAds, bidCount, paidOrders, range });
}
