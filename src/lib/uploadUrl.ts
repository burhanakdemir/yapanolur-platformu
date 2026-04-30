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

export function allowedUploadHosts(): string[] {
  const fromEnv = (process.env.ALLOWED_UPLOAD_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...fromEnv];
}

export function isAllowedUploadUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (raw.startsWith("/uploads/")) return true;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return allowedUploadHosts().some((pattern) => matchesHostPattern(u.hostname, pattern));
  } catch {
    return false;
  }
}
