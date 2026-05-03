const DEFAULT_ALLOWED_HOSTS = [
  "images.unsplash.com",
  "*.public.blob.vercel-storage.com",
];

function matchesHostPattern(hostname: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedHost = hostname.trim().toLowerCase();
  if (!normalizedPattern) return false;
  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(1);
    return normalizedHost.endsWith(suffix);
  }
  return normalizedHost === normalizedPattern;
}

/** `S3_PUBLIC_BASE_URL` ile `buildS3PublicUrl` ile aynı önek (ör. CDN / özel uç nokta). */
function matchesConfiguredPublicUploadBase(fullUrl: string): boolean {
  const base = (process.env.S3_PUBLIC_BASE_URL ?? "").trim();
  if (!base) return false;
  const normalized = base.replace(/\/+$/, "");
  const t = fullUrl.trim();
  return t.startsWith(`${normalized}/`) || t === normalized;
}

/**
 * Yerel dosya yolu `/uploads/...` değil; prod’da S3 sanal host veya R2 vb. ortak desenler.
 * Kötüye kullanımı azaltmak için yalnızca bilinen depo host sonekleri.
 */
function isKnownObjectStorageHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (h.endsWith(".amazonaws.com") || h.endsWith(".amazonaws.com.cn")) return true;
  if (h.includes(".digitaloceanspaces.com")) return true;
  if (h.includes(".r2.cloudflarestorage.com")) return true;
  if (h.endsWith(".blob.core.windows.net")) return true;
  if (h.includes(".storage.googleapis.com")) return true;
  return false;
}

export function allowedUploadHosts(): string[] {
  const fromEnv = (process.env.ALLOWED_UPLOAD_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...fromEnv];
}

/** Tam URL ile gelen `/uploads/...` yalnızca localhost / LAN / ALLOWED_UPLOAD_HOSTS ile sınırlı (rastgele domain kabul edilmez). */
function isLocalOrLanHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (h === "localhost") return true;
  if (h === "[::1]" || h === "::1") return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const d = Number(m[4]);
  if (a === 127 && d >= 0 && d <= 255) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isAllowedUploadUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (raw.startsWith("/uploads/")) return true;
  if (matchesConfiguredPublicUploadBase(raw)) return true;
  try {
    const u = new URL(raw);
    if (u.pathname.startsWith("/uploads/")) {
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      if (isLocalOrLanHost(u.hostname)) return true;
      if (isKnownObjectStorageHost(u.hostname)) return true;
      return allowedUploadHosts().some((pattern) => matchesHostPattern(u.hostname, pattern));
    }
    if (u.protocol !== "https:") return false;
    return allowedUploadHosts().some((pattern) => matchesHostPattern(u.hostname, pattern));
  } catch {
    return false;
  }
}
