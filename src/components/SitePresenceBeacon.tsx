"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function shouldSkipPresence(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/executive")) return true;
  if (pathname.startsWith("/g/")) return true;
  return false;
}

/**
 * Genel site için hafif varlık ping’i (çoklu sekme / gezinme — aralık ve throttle ile).
 */
export default function SitePresenceBeacon() {
  const pathname = usePathname() ?? "";
  const lastPingAt = useRef(0);

  useEffect(() => {
    if (shouldSkipPresence(pathname)) return;

    let cancelled = false;

    async function ping() {
      const now = Date.now();
      if (now - lastPingAt.current < 55_000) return;
      lastPingAt.current = now;
      try {
        await fetch("/api/analytics/presence", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      } catch {
        /* ağ hatası — yoksay */
      }
    }

    void ping();
    const id = setInterval(() => {
      if (!cancelled) void ping();
    }, 120_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  return null;
}
