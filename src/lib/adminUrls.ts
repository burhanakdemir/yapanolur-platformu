import {
  effectiveAdminBrowserPrefixForPathname,
  getAdminPanelPathPrefixFromEnv,
} from "@/lib/adminPanelPathEnv";

/**
 * Dış yönetici tabanı: NEXT_PUBLIC_ADMIN_PANEL_PATH. Tanımsızsa varsayılan `/a/yonetici`; klasik `/admin` için env'de boş string.
 * `next.config` `env` ile bundle'a işlenir; ayrıntı: adminPanelPathEnv.
 */
export function getAdminPanelPathPrefix(): string {
  return getAdminPanelPathPrefixFromEnv();
}

/**
 * Tarayıcıda kullanılan yol. `suffix` iç bölüm: "/listings", "/members/1".
 * Ana özet: adminUrl() veya adminUrl("/").
 */
export function adminUrl(suffix = ""): string {
  const prefix = getAdminPanelPathPrefix();
  const s =
    suffix === "" || suffix === "/"
      ? ""
      : suffix.startsWith("/")
        ? suffix
        : `/${suffix}`;
  if (!prefix) return `/admin${s}`;
  return `${prefix}${s}`;
}

/** Middleware: tarayıcı pathname → App Router iç yolu (/admin/...). */
export function adminBrowserPathToInternal(pathname: string): string {
  const prefix = effectiveAdminBrowserPrefixForPathname(pathname);
  if (!prefix) return pathname;
  if (pathname === prefix || pathname === `${prefix}/`) {
    return "/admin";
  }
  const prefixSlash = `${prefix}/`;
  if (pathname.startsWith(prefixSlash)) {
    const rest = pathname.slice(prefix.length);
    return `/admin${rest}`;
  }
  return pathname;
}

/** İstemci: mevcut route yönetici arayüzü mü (yer işaretleri / footer)? */
export function isAdminSectionPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const prefix = getAdminPanelPathPrefix();
  if (prefix) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
