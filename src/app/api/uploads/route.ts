import { NextResponse } from "next/server";
import path from "path";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { rateLimitGuard } from "@/lib/rateLimit";
import { saveUploadedFile } from "@/lib/uploadStorage";

type Body = {
  filename: string;
  dataBase64: string;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

export async function POST(req: Request) {
  try {
    const contentLength = Number.parseInt(req.headers.get("content-length") ?? "0", 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES * 2) {
      return NextResponse.json({ error: "Istek govdesi cok buyuk." }, { status: 413 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const limited = await rateLimitGuard(req, "upload", { userId: session.userId });
    if (limited) return limited;

    const body: Body = await req.json();
    if (!body?.filename || !body?.dataBase64) {
      return NextResponse.json({ error: "Eksik payload" }, { status: 400 });
    }

    const name = path.basename(body.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Desteklenmeyen dosya turu." }, { status: 400 });
    }
    const buffer = Buffer.from(body.dataBase64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Dosya boyutu gecersiz veya cok buyuk." }, { status: 400 });
    }
    const { url } = await saveUploadedFile(name, buffer);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Dosya yuklenemedi." }, { status: 500 });
  }
}
