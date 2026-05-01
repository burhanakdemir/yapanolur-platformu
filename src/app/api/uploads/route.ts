import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { parseUploadPayload } from "@/lib/parseUploadPayload";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadConstraints";
import { saveUploadedFile, isUploadStorageMisconfiguredError } from "@/lib/uploadStorage";

export async function POST(req: Request) {
  try {
    const contentLength = Number.parseInt(req.headers.get("content-length") ?? "0", 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES * 2) {
      return NextResponse.json({ error: "Istek govdesi cok buyuk.", code: "payload_too_large" }, { status: 413 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli.", code: "auth_required" }, { status: 401 });
    }

    const limited = await rateLimitGuard(req, "upload", { userId: session.userId });
    if (limited) return limited;

    const body: unknown = await req.json();
    const parsed = parseUploadPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    try {
      const { url } = await saveUploadedFile(parsed.filename, parsed.buffer);
      return NextResponse.json({ ok: true, url });
    } catch (err) {
      console.error("[uploads]", err);
      if (isUploadStorageMisconfiguredError(err)) {
        return NextResponse.json(
          {
            error: "Dosya depolama yapilandirmasi eksik veya kullanılamıyor.",
            code: "storage_config",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Dosya yuklenemedi.", code: "storage_failed" }, { status: 500 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Dosya yuklenemedi.", code: "bad_request" }, { status: 500 });
  }
}
