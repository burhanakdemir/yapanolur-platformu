"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SiteFooterNav from "@/components/SiteFooterNav";
import FooterSupportStrip from "@/components/FooterSupportStrip";
import SupportFloatingWidget from "@/components/SupportFloatingWidget";
import { getLang } from "@/lib/i18n";

function shouldHideFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/panel/admin" || pathname.startsWith("/panel/admin/")) return true;
  return false;
}

function AppSiteFooterInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang") ?? undefined);

  if (shouldHideFooter(pathname)) return null;

  return (
    <div className="shrink-0 px-6 pb-6 max-[480px]:px-4">
      <div className="mx-auto mt-8 w-full max-w-7xl">
        <footer className="glass-card w-full rounded-2xl p-5 text-sm text-slate-600">
          <div className="relative mb-4 border-b border-orange-200/60 pb-4">
            <SiteFooterNav
              lang={lang}
              className="mb-0 border-0 pb-0 sm:pr-[8rem]"
            />
            <div className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2 max-sm:static max-sm:mt-3 max-sm:translate-y-0">
              <SupportFloatingWidget anchor="footer" />
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <FooterSupportStrip lang={lang} />
            <p className="text-center md:text-right">Copyright © 2026 yapanolur.com</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function AppSiteFooter() {
  return (
    <Suspense fallback={null}>
      <AppSiteFooterInner />
    </Suspense>
  );
}
