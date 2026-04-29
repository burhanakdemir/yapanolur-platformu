import { NextResponse } from "next/server";
import { shouldUseSecureCookie } from "@/lib/cookieSecure";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
