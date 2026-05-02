/**
 * Yönetici paneli tarayıcı öneki — `next.config.ts` `env` bloğu ve runtime kod ortak kullanır.
 * Middleware webpack bazen `process.env.NEXT_PUBLIC_*` okumasını boş sabitler; `env` ile bundle'a yazılır.
 */

export function normalizeAdminPanelPathPrefix(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const withSlash = t.startsWith("/") ? t : `/${t}`;
  return withSlash.replace(/\/+$/, "") || "";
}

/** `.env` / süreç ortamından ham değer (normalize öncesi). */
export function rawAdminPanelPathFromEnv(): string {
  if (!Object.prototype.hasOwnProperty.call(process.env, "NEXT_PUBLIC_ADMIN_PANEL_PATH")) {
    return process.env.NODE_ENV !== "production" ? "/a/yonetici" : "";
  }
  return (process.env.NEXT_PUBLIC_ADMIN_PANEL_PATH ?? "").trim();
}

export function getAdminPanelPathPrefixFromEnv(): string {
  return normalizeAdminPanelPathPrefix(rawAdminPanelPathFromEnv());
}

const DEV_DEFAULT_ADMIN_BROWSER_PREFIX = "/a/yonetici";

/**
 * Gizli taban veya geliştirme varsayılanı varken doğrudan `/admin` kapatılsın.
 * `next.config` `redirects()` Node ortamında çalışır — middleware `NODE_ENV` güvenilir olmayabilir.
 */
export function embedAdminLegacyHiddenFlagFromEnv(): string {
  if (getAdminPanelPathPrefixFromEnv()) return "1";
  if (Object.prototype.hasOwnProperty.call(process.env, "NEXT_PUBLIC_ADMIN_PANEL_PATH")) {
    return "";
  }
  return process.env.NODE_ENV !== "production" ? "1" : "";
}

/**
 * Middleware: env Edge'de boş dönerse pathname ile `/a/yonetici` eşlemesi (geliştirme güvenliği).
 */
export function effectiveAdminBrowserPrefixForPathname(pathname: string): string {
  const configured = getAdminPanelPathPrefixFromEnv();
  if (configured) return configured;

  if (
    pathname !== DEV_DEFAULT_ADMIN_BROWSER_PREFIX &&
    !pathname.startsWith(`${DEV_DEFAULT_ADMIN_BROWSER_PREFIX}/`)
  ) {
    return "";
  }

  if (Object.prototype.hasOwnProperty.call(process.env, "NEXT_PUBLIC_ADMIN_PANEL_PATH")) {
    return "";
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_DEFAULT_ADMIN_BROWSER_PREFIX;
  }

  return "";
}
