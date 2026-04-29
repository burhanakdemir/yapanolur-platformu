/**
 * Yönetici `AdminSettings.newAdEmailWebhookUrlsJson` — https (veya geliştirme için http) URL listesi.
 */
export function parseNewAdEmailWebhookUrls(json: string | null | undefined): string[] {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((u): u is string => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
  } catch {
    return [];
  }
}

export function stringifyNewAdEmailWebhookUrls(urls: string[]): string {
  return JSON.stringify(
    [...new Set(urls.map((u) => u.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en")),
  );
}

export function isAllowedWebhookUrlForPolicy(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function filterAllowedWebhookUrls(urls: string[]): string[] {
  return [...new Set(urls.map((s) => s.trim()).filter((s) => s.length > 0))].filter(isAllowedWebhookUrlForPolicy);
}
