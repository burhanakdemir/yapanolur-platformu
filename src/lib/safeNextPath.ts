/**
 * `?next=` open-redirect önleme: yalnızca site içi göreli yol (isteğe bağlı sorgu).
 */
export function getSafeInternalNextPath(
  raw: string | null | undefined,
  fallback: string = "/panel/user",
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(trimmed)) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("@")) return fallback;
  return trimmed;
}
