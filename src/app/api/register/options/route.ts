import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignupVerificationFlags } from "@/lib/signupVerificationSettings";

export const dynamic = "force-dynamic";

/** Kayıt formu: OTP zorunluluğu (public, yalnızca iki boolean). */
export async function GET() {
  try {
    const flags = await getSignupVerificationFlags(prisma);
    const res = NextResponse.json(flags);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("[register/options]", e);
    const res = NextResponse.json({
      signupEmailVerificationRequired: true,
      signupPhoneVerificationRequired: true,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
