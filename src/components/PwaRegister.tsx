"use client";

import { useEffect } from "react";

/**
 * Üretimde passthrough service worker kaydı — Chrome “yüklenebilir” PWA kriteri.
 * Geliştirmede kayıt yok (HMR / önbellek sürprizlerini önler).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return null;
}
