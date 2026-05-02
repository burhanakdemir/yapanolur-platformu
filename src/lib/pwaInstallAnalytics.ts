/** GA4 / GTM yoksa bile `window` CustomEvent ile dinlenebilir; `gtag` varsa event gönderilir. */

export type PwaInstallTrackEvent =
  | "pwa_cta_click"
  | "pwa_modal_open"
  | "pwa_android_install_click"
  | "pwa_appinstalled";

export function trackPwaInstall(
  event: PwaInstallTrackEvent,
  detail?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("pwa-install-analytics", {
        detail: { event, ts: Date.now(), ...detail },
      }),
    );
  } catch {
    /* ignore */
  }
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, detail ?? {});
  }
}
