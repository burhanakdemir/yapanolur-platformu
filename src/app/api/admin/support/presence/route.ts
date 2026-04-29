import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { prisma } from "@/lib/prisma";

/**
 * Yönetici canlı destek: müsait + heartbeat (45 sn aralıkla çağrılmalı).
 */
export async function POST() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = await prisma.adminSupportPresence.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      isAvailable: true,
      lastPingAt: new Date(),
    },
    update: {
      isAvailable: true,
      lastPingAt: new Date(),
    },
  });
  return NextResponse.json({
    ok: true,
    lastPingAt: body.lastPingAt.toISOString(),
    isAvailable: body.isAvailable,
  });
}

/** Müsait değil (ayrılmadan “pasif” için). */
export async function DELETE() {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = await prisma.adminSupportPresence.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      isAvailable: false,
      lastPingAt: new Date(),
    },
    update: {
      isAvailable: false,
      lastPingAt: new Date(),
    },
  });
  return NextResponse.json({
    ok: true,
    isAvailable: body.isAvailable,
  });
}
