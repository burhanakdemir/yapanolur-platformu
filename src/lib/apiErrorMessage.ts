/**
 * API JSON gövdesindeki `error` alanını güvenli metne çevirir (Zod issues dizisi, tek nesne vb.).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    const parts = error.map((item) => {
      if (item && typeof item === "object" && "message" in item) {
        return String((item as { message: unknown }).message);
      }
      return null;
    });
    const joined = parts.filter(Boolean).join(" ").trim();
    return joined || fallback;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}
