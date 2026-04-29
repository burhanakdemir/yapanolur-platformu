import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import {
  handleSupportThreadGet,
  handleSupportThreadPost,
  visitorCookieOptions,
} from "@/lib/supportThreadServer";
import { SUPPORT_VISITOR_COOKIE } from "@/lib/supportConstants";

export async function GET(req: NextRequest) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  const r = await handleSupportThreadGet(session, req);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({
    ...r.data,
    pollMs: 4000,
  });
}

export async function POST(req: NextRequest) {
  const c = await cookies();
  const session = await verifySessionToken(c.get("session_token")?.value);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const b = body as { body?: unknown; guestEmail?: unknown; forceNew?: unknown };
  const r = await handleSupportThreadPost(req, session, {
    body: typeof b.body === "string" ? b.body : "",
    guestEmail: typeof b.guestEmail === "string" ? b.guestEmail : null,
    forceNew: Boolean(b.forceNew),
  });
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const res = NextResponse.json({ thread: r.data.thread, pollMs: 4000 });
  if (r.data.setCookie) {
    res.cookies.set(
      SUPPORT_VISITOR_COOKIE,
      r.data.setCookie,
      visitorCookieOptions(),
    );
  }
  return res;
}
