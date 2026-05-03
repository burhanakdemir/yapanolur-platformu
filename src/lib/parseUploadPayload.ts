import path from "path";
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/uploadConstraints";

type ParsedUploadPayload =
  | { ok: true; filename: string; buffer: Buffer }
  | { ok: false; status: number; error: string; code?: string };

/**
 * JSON govdesinden dosya adi + base64 buffer dogrular (/api/uploads ile ayni kurallar).
 */
export function parseUploadPayload(body: unknown): ParsedUploadPayload {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Eksik payload", code: "invalid_payload" };
  }
  const b = body as { filename?: unknown; dataBase64?: unknown };
  const filenameRaw = b.filename;
  const dataRaw = b.dataBase64;
  if (typeof filenameRaw !== "string" || typeof dataRaw !== "string") {
    return { ok: false, status: 400, error: "Eksik payload", code: "invalid_payload" };
  }

  const name = path.basename(filenameRaw).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      status: 400,
      error: "Desteklenmeyen dosya turu.",
      code: "unsupported_type",
    };
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataRaw, "base64");
  } catch {
    return { ok: false, status: 400, error: "Gecersiz dosya verisi.", code: "invalid_encoding" };
  }
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 400,
      error: "Dosya boyutu gecersiz veya cok buyuk.",
      code: "file_too_large",
    };
  }
  return { ok: true, filename: name, buffer };
}
