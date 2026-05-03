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

type ZodFlattenLike = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

/**
 * `issues` (Zod flatten) varsa alan mesajlarını ekler — kullanıcı "Kaydedilemedi" yerine nedeni görür.
 */
export function apiErrorMessageWithIssues(
  body: Record<string, unknown>,
  fallback: string,
): string {
  const base = apiErrorMessage(body.error, fallback);
  const issues = body.issues as ZodFlattenLike | undefined;
  if (!issues || typeof issues !== "object") return base;

  const parts: string[] = [];
  if (Array.isArray(issues.formErrors)) {
    for (const m of issues.formErrors) {
      if (m) parts.push(String(m));
    }
  }
  if (issues.fieldErrors && typeof issues.fieldErrors === "object") {
    for (const msgs of Object.values(issues.fieldErrors)) {
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          if (m) parts.push(String(m));
        }
      }
    }
  }
  if (parts.length === 0) return base;
  return `${base} ${parts.slice(0, 10).join(" · ")}`.trim();
}
