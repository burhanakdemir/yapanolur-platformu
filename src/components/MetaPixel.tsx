"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { COOKIE_CONSENT_CHANGED_EVENT } from "@/lib/cookieConsent";
import {
  getMetaPixelId,
  initMetaPixel,
  isMetaPixelInitialized,
  isMetaPixelPathExcluded,
  META_PIXEL_BOOTSTRAP_SCRIPT,
  shouldLoadMetaPixelNow,
  trackMetaPixelPageView,
} from "@/lib/metaPixel";

export default function MetaPixel() {
  const pathname = usePathname();
  const pixelId = getMetaPixelId();
  const pathExcluded = isMetaPixelPathExcluded(pathname);
  const [consentAllows, setConsentAllows] = useState(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const prevPathRef = useRef<string | null>(null);

  const syncConsent = useCallback(() => {
    setConsentAllows(shouldLoadMetaPixelNow(pathname));
  }, [pathname]);

  useEffect(() => {
    syncConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
  }, [syncConsent]);

  const active = Boolean(pixelId && !pathExcluded && consentAllows);

  useEffect(() => {
    if (!active) {
      setBootstrapDone(false);
      prevPathRef.current = null;
    }
  }, [active]);

  const handleScriptLoad = useCallback(() => {
    initMetaPixel();
    setBootstrapDone(true);
    prevPathRef.current = pathname ?? "/";
  }, [pathname]);

  useEffect(() => {
    if (!active) return;

    const current = pathname ?? "/";

    if (isMetaPixelInitialized() && !bootstrapDone) {
      setBootstrapDone(true);
      if (prevPathRef.current === null) {
        trackMetaPixelPageView();
        prevPathRef.current = current;
      }
      return;
    }

    if (!bootstrapDone) return;

    if (prevPathRef.current === null) {
      prevPathRef.current = current;
      return;
    }
    if (prevPathRef.current !== current) {
      trackMetaPixelPageView();
      prevPathRef.current = current;
    }
  }, [active, pathname, bootstrapDone]);

  if (!active || !pixelId) return null;

  const noscriptSrc = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;

  return (
    <>
      <Script
        id="meta-pixel-bootstrap"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: META_PIXEL_BOOTSTRAP_SCRIPT }}
        onLoad={handleScriptLoad}
      />
      <noscript>
        <img height="1" width="1" style={{ display: "none" }} alt="" src={noscriptSrc} />
      </noscript>
    </>
  );
}
