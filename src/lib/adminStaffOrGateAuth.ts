import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/adminGate";
import { isStaffAdminRole } from "@/lib/adminRoles";

/**
 * Middleware ile uyum: `/admin` sayfasına panel şifresi (`admin_gate`) ile giren kullanıcı
 * da içerik API’lerini kullanabilmeli (yalnızca oturum kontrolü yapan route’lar 403 üretirdi).
 */
export async function canStaffAdminOrGateAdmin(): Promise<boolean> {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (session && isStaffAdminRole(session.role)) return true;
  return verifyAdminGateToken(c.get(ADMIN_GATE_COOKIE)?.value);
}
