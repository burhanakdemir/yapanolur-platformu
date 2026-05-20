import {
  readStoredCookieConsent,
  shouldLoadOptionalClientMonitoring,
  type CookieConsentRecord,
} from "@/lib/cookieConsent";
import { isAdminSectionPathname } from "@/lib/adminUrls";

/** Meta Business Manager — varsayılan; `NEXT_PUBLIC_META_PIXEL_ID` ile geçersiz kılınır veya `0` ile kapatılır. */
const DEFAULT_META_PIXEL_ID = "1504948734492879";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let pixelInited = false;

export const META_PIXEL_BOOTSTRAP_SCRIPT = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');`;

export function getMetaPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (raw === "0" || raw?.toLowerCase() === "false" || raw?.toLowerCase() === "off") {
    return null;
  }
  if (raw && /^\d{10,20}$/.test(raw)) {
    return raw;
  }
  return DEFAULT_META_PIXEL_ID;
}

export function isMetaPixelPathExcluded(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (isAdminSectionPathname(pathname)) return true;
  if (pathname.startsWith("/panel/admin")) return true;
  if (pathname === "/g/yonetici") return true;
  return false;
}

export function canRunMetaPixel(
  pathname: string | null | undefined,
  record: CookieConsentRecord | null,
): boolean {
  if (!getMetaPixelId()) return false;
  if (isMetaPixelPathExcluded(pathname)) return false;
  return shouldLoadOptionalClientMonitoring(record);
}

export function isMetaPixelInitialized(): boolean {
  return pixelInited;
}

/** `fbq` kuyruğuna init + ilk PageView (resmi snippet ile aynı sıra). */
export function initMetaPixel(): void {
  const id = getMetaPixelId();
  if (!id || typeof window === "undefined" || pixelInited) return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  fbq("init", id);
  fbq("track", "PageView");
  pixelInited = true;
}

/** İstemci yönlendirmelerinde ek sayfa görüntüleme. */
export function trackMetaPixelPageView(): void {
  if (!pixelInited || typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq === "function") {
    fbq("track", "PageView");
  }
}

export function shouldLoadMetaPixelNow(pathname: string | null | undefined): boolean {
  return canRunMetaPixel(pathname, readStoredCookieConsent());
}
