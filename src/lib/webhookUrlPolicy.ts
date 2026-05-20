/**
 * Yönetici webhook URL’leri — SSRF’e karşı host filtreleri.
 */

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums as [number, number, number, number];
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;
  if (h === "::1" || h === "[::1]") return true;
  if (h.startsWith("fc") || h.startsWith("fd") || h.includes(":")) {
    if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) {
      return true;
    }
  }

  const v4 = parseIpv4(h);
  if (!v4) return false;
  const [a, b] = v4;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

export function isBlockedWebhookHostname(hostname: string): boolean {
  return isPrivateOrLocalHostname(hostname);
}

export function isAllowedWebhookProtocol(protocol: string, opts?: { productionOnlyHttps?: boolean }): boolean {
  if (opts?.productionOnlyHttps) {
    return protocol === "https:";
  }
  return protocol === "https:" || protocol === "http:";
}

export function isAllowedWebhookUrl(url: string, opts?: { productionOnlyHttps?: boolean }): boolean {
  try {
    const u = new URL(url);
    if (!isAllowedWebhookProtocol(u.protocol, opts)) return false;
    if (isBlockedWebhookHostname(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
