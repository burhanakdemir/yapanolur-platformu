import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { BRAND_LOGO_PATH } from "@/lib/brand";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  title: string;
  children: ReactNode;
};

export default function StaticSitePage({ lang, title, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl p-6 space-y-8">
      <header className="w-full rounded-xl bg-[linear-gradient(90deg,#ffffff_0%,#fff7ed_12%,#fed7aa_26%,#fb923c_52%,#f97316_78%,#ea580c_100%)] p-5 shadow-sm outline-none md:rounded-2xl md:p-6">
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 sm:gap-4">
          <Link
            href={`/?lang=${lang}`}
            className="inline-flex shrink-0 items-center self-center text-inherit no-underline"
          >
            <Image
              src={BRAND_LOGO_PATH}
              alt="yapanolur.com"
              width={640}
              height={154}
              className="h-24 w-auto max-w-[min(100%,320px)] object-contain object-left sm:h-28 sm:max-w-[min(100%,640px)]"
            />
          </Link>
          <h1 className="min-w-0 flex-1 self-center px-1 text-center text-lg font-bold leading-none tracking-tight text-orange-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] sm:px-3 sm:text-2xl">
            {title}
          </h1>
          <Link
            href={`/?lang=${lang}`}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-center rounded-xl border border-white/50 bg-white/90 px-4 py-2.5 text-center text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-white sm:min-h-[48px] sm:px-5 sm:py-3 sm:text-base"
          >
            {lang === "tr" ? "Ana Sayfa" : "Home"}
          </Link>
        </div>
      </header>

      <article className="glass-card rounded-2xl p-6 space-y-4 text-sm leading-relaxed text-slate-700">
        {children}
      </article>
    </main>
  );
}
