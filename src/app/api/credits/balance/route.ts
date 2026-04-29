import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { sumUserCreditTry } from "@/lib/userCredit";

export async function GET() {
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }
  const balance = await sumUserCreditTry(session.userId);
  return NextResponse.json({ balance });
}
