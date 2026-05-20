import { isAllowedWebhookUrl } from "@/lib/webhookUrlPolicy";

/**
 * Yönetici `AdminSettings.newAdEmailWebhookUrlsJson` — https (üretimde yalnızca https) URL listesi.
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

function webhookPolicyOpts(): { productionOnlyHttps: boolean } {
  return { productionOnlyHttps: process.env.NODE_ENV === "production" };
}

export function filterAllowedWebhookUrls(urls: string[]): string[] {
  const opts = webhookPolicyOpts();
  return [...new Set(urls.map((s) => s.trim()).filter((s) => s.length > 0))].filter((u) =>
    isAllowedWebhookUrl(u, opts),
  );
}
