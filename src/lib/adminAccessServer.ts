import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "@/lib/auth";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "@/lib/adminGate";
import { isStaffAdminRole } from "@/lib/adminRoles";

/** Tam yönetici paneli: staff oturumu + TOTP veya (legacy) admin_gate çerezi */
export async function hasFullAdminAccess(): Promise<boolean> {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  if (isStaffAdminRole(session?.role)) {
    return session?.adminTotp === true;
  }
  return verifyAdminGateToken(c.get(ADMIN_GATE_COOKIE)?.value);
}

export function staffSessionNeedsTotp(session: SessionPayload | null): boolean {
  return isStaffAdminRole(session?.role) && session?.adminTotp !== true;
}
