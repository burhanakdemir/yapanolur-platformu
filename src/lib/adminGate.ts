import { jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/authSecret";

export const ADMIN_GATE_COOKIE = "admin_gate";

export async function verifyAdminGateToken(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return (payload as { gate?: string }).gate === "admin";
  } catch {
    return false;
  }
}
