import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { getAuthSecretKey } from "@/lib/authSecret";
import type { AppUserRole } from "@/lib/adminRoles";

export type SessionPayload = {
  userId: string;
  email: string;
  role: AppUserRole;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  return verifySessionToken(token);
}
