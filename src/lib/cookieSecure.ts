/**
 * Oturum çerezleri için `Secure` bayrağı.
 * Önce `Host` özel ağ/localhost mı diye bakılır: http:// + LAN IP (Chrome) ile
 * eşleşen çerez için Secure olmamalı; yoksa tarayıcı çerezi düşürür. Yanlış
 * `x-forwarded-proto: https` bu kontrolden *önce* değerlendirilmez.
 */
function hostLooksLikePrivateLanOrLocalhost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
  const parts = h.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function requestHost(req: Request): string {
  const fromHeader = req.headers.get("host")?.split(":")[0]?.trim();
  if (fromHeader) return fromHeader;
  try {
    return new URL(req.url).hostname;
  } catch {
    return "";
  }
}

export function shouldUseSecureCookie(req: Request): boolean {
  const host = requestHost(req);

  if (hostLooksLikePrivateLanOrLocalhost(host)) {
    return false;
  }

  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
  }

  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
