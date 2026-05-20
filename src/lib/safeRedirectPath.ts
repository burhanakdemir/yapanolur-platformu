import { isAdminSectionPathname, adminUrl } from "@/lib/adminUrls";

/** Aynı-origin göreli yol doğrulaması için sabit taban (gerçek host kullanılmaz). */
const REDIRECT_VALIDATOR_ORIGIN = "https://redirect-validator.local";

function unsafeRelativePath(pathWithSearchHash: string): boolean {
  if (!pathWithSearchHash.startsWith("/") || pathWithSearchHash.startsWith("//")) {
    return true;
  }
  if (pathWithSearchHash.includes("\\") || pathWithSearchHash.includes("@")) {
    return true;
  }
  if (/[\u0000-\u001f\u007f]/.test(pathWithSearchHash)) {
    return true;
  }
  return false;
}

/**
 * `?next=` ve benzeri açık yönlendirmeleri engeller (`//host`, `/%2F%2F`, `\`, `@`).
 * Geçersizse `fallback` döner.
 */
export function sanitizePublicNextPath(
  raw: string | null | undefined,
  fallback = "/panel/user",
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  try {
    const u = new URL(trimmed, REDIRECT_VALIDATOR_ORIGIN);
    if (u.origin !== REDIRECT_VALIDATOR_ORIGIN) return fallback;
    const out = `${u.pathname}${u.search}${u.hash}`;
    if (unsafeRelativePath(out)) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

function isAllowedAdminRedirectPathname(pathname: string): boolean {
  if (isAdminSectionPathname(pathname)) return true;
  if (pathname === "/executive" || pathname.startsWith("/executive/")) return true;
  return false;
}

/** Yönetici gate `next` — yalnızca yönetici veya iş özeti yolları. */
export function sanitizeAdminNextPath(raw: string | null | undefined, fallback?: string): string {
  const fb = fallback ?? adminUrl();
  const candidate = sanitizePublicNextPath(raw, fb);
  try {
    const u = new URL(candidate, REDIRECT_VALIDATOR_ORIGIN);
    if (!isAllowedAdminRedirectPathname(u.pathname)) return fb;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fb;
  }
}
