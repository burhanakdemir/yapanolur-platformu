import { randomBytes } from "node:crypto";
import fs from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Render odakli provider secimi:
 * - local: yalnizca development/istekli production override
 * - s3: AWS S3 veya S3-uyumlu servisler (R2, MinIO, DO Spaces)
 */
type StorageProvider = "local" | "s3";

let cachedS3Client: S3Client | null = null;
let cachedS3ClientKey = "";

function safeBaseName(name: string): string {
  const ext = path.extname(name) || ".jpg";
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  return `${base}-${randomBytes(4).toString("hex")}${ext.toLowerCase()}`;
}

function resolveStorageProvider(): StorageProvider {
  const raw = (process.env.STORAGE_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "s3") return "s3";
  if (raw === "local") return "local";
  if (process.env.NODE_ENV === "production") return "s3";
  return "local";
}

function ensureLocalWriteAllowed() {
  const provider = resolveStorageProvider();
  if (provider !== "local") return;
  const allowInProd = process.env.ALLOW_LOCAL_UPLOADS_IN_PRODUCTION === "1";
  if (process.env.NODE_ENV === "production" && !allowInProd) {
    throw new Error(
      "STORAGE_PROVIDER=local production modda devre disi. S3 kullanin veya ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=1 ayarlayin.",
    );
  }
}

function getS3Client(): S3Client {
  const region = (process.env.S3_REGION ?? "").trim();
  const endpoint = (process.env.S3_ENDPOINT ?? "").trim();
  const accessKeyId = (process.env.S3_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY ?? "").trim();
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "1";

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 ayarlari eksik: S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY zorunlu.");
  }

  const cacheKey = JSON.stringify({ region, endpoint, accessKeyId, forcePathStyle });
  if (cachedS3Client && cachedS3ClientKey === cacheKey) return cachedS3Client;

  cachedS3Client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  cachedS3ClientKey = cacheKey;
  return cachedS3Client;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildS3PublicUrl(bucket: string, key: string): string {
  const explicit = (process.env.S3_PUBLIC_BASE_URL ?? "").trim();
  if (explicit) {
    return `${normalizeBaseUrl(explicit)}/${key}`;
  }
  const endpoint = (process.env.S3_ENDPOINT ?? "").trim();
  const region = (process.env.S3_REGION ?? "").trim();
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "1";
  if (endpoint) {
    const normalized = normalizeBaseUrl(endpoint);
    return forcePathStyle ? `${normalized}/${bucket}/${key}` : `${normalized}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function saveToS3(safeName: string, buffer: Buffer): Promise<{ url: string }> {
  const bucket = (process.env.S3_BUCKET ?? "").trim();
  if (!bucket) {
    throw new Error("S3_BUCKET zorunlu.");
  }
  const prefix = (process.env.S3_KEY_PREFIX ?? "uploads").trim().replace(/^\/+|\/+$/g, "");
  const key = prefix ? `${prefix}/${safeName}` : safeName;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeTypeByExtension(path.extname(safeName)),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { url: buildS3PublicUrl(bucket, key) };
}

export function uploadMimeTypeForExtension(extRaw: string): string {
  const ext = extRaw.toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  return "image/jpeg";
}

function mimeTypeByExtension(extRaw: string): string {
  return uploadMimeTypeForExtension(extRaw);
}

/**
 * Yerel dosya yazım kökü.
 * - `LOCAL_UPLOAD_ROOT` boşsa: `public/uploads` (Next statik servisi).
 * - Render kalıcı disk: örn. `/var/data/uploads` — `next.config` ile `/uploads/*` bu dizinden sunulur.
 */
export function getLocalUploadAbsoluteRoot(): string {
  const fromEnv = (process.env.LOCAL_UPLOAD_ROOT ?? "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "public", "uploads");
}

/** Kalıcı disk / env ile `public` dışına çıkıldı mı (HTTP için rewrite gerekir). */
export function usesExternalLocalUploadRoot(): boolean {
  return (process.env.LOCAL_UPLOAD_ROOT ?? "").trim().length > 0;
}

/** Sağlık kontrolü: dizin oluşturulabilir ve tek bir probe dosyası yazılıp silinebilir mi. */
export async function probeLocalUploadWritable(): Promise<{ ok: boolean; root: string }> {
  const root = getLocalUploadAbsoluteRoot();
  try {
    await fs.mkdir(root, { recursive: true });
    const probe = path.join(root, `.health-${randomBytes(6).toString("hex")}.tmp`);
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
    return { ok: true, root };
  } catch {
    return { ok: false, root };
  }
}

async function saveToLocal(safeName: string, buffer: Buffer): Promise<{ url: string }> {
  ensureLocalWriteAllowed();
  const uploadsDir = getLocalUploadAbsoluteRoot();
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, safeName);
  await fs.writeFile(filePath, buffer);
  return { url: `/uploads/${safeName}` };
}

export async function saveUploadedFile(
  originalName: string,
  buffer: Buffer,
): Promise<{ url: string }> {
  const provider = resolveStorageProvider();
  const safeName = safeBaseName(originalName);
  if (provider === "s3") return saveToS3(safeName, buffer);
  return saveToLocal(safeName, buffer);
}

/** Prod S3 eksik env veya yerel yazim kapali — istemciye 503 + kod ile donulebilir. */
export function isUploadStorageMisconfiguredError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return (
    m.includes("S3 ayarlari eksik") ||
    m.includes("S3_BUCKET zorunlu") ||
    m.includes("STORAGE_PROVIDER=local production modda devre disi")
  );
}
