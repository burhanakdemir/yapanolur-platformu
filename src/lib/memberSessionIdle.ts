import type { NextRequest, NextResponse } from "next/server";
import { createSessionToken, type SessionPayload } from "@/lib/auth";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";

/** Üye (MEMBER) oturumu — sunucu tarafı hareketsizlik süresi (JWT `lastActivity`). */

function getMemberIdleTimeoutMs(): number {
  const raw = process.env.MEMBER_IDLE_TIMEOUT_MINUTES?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 5 && n <= 24 * 60) {
    return Math.floor(n * 60 * 1000);
  }
  return 30 * 60 * 1000;
}

/** `lastActivity` yoksa eski jeton — süre dolmuş sayılmaz (bir sonraki istekte yenilenir). */
export function isMemberIdleExpired(lastActivity: unknown): boolean {
  if (typeof lastActivity !== "number" || !Number.isFinite(lastActivity)) {
    return false;
  }
  return Date.now() - lastActivity > getMemberIdleTimeoutMs();
}

/** Middleware çıkışında: MEMBER için `lastActivity` güncellenmiş JWT çerezi (ADMIN/SUPER_ADMIN dokunulmaz). */
export async function applyMemberActivityRefresh(
  req: NextRequest,
  session: SessionPayload | null,
  res: NextResponse,
): Promise<NextResponse> {
  if (!session || session.role !== "MEMBER") return res;
  if (isMemberIdleExpired(session.lastActivity)) return res;
  const token = await createSessionToken({
    userId: session.userId,
    email: session.email,
    role: session.role,
    lastActivity: Date.now(),
  });
  res.cookies.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
