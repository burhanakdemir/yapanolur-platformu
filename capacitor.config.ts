import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mağaza kabuğu: kanonik site WebView’da açılır (Next.js SSR bu repoda ayrı deploy edilir).
 * @see docs/mobile-capacitor.md — mobile/README.md
 */
const productionUrl = "https://yapanolur.com";
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || productionUrl;

const config: CapacitorConfig = {
  appId: "tr.yapanolur.ilan",
  appName: "YapanOlur İlan",
  webDir: "mobile/www",
  android: {
    path: "mobile/android",
  },
  server: {
    androidScheme: "https",
    url: serverUrl,
    cleartext: process.env.CAPACITOR_ALLOW_CLEARTEXT === "1",
  },
};

export default config;
