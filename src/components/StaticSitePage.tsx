import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";

type Props = {
  lang: Lang;
  title: string;
  children: ReactNode;
};

export default function StaticSitePage({ lang, title, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl p-6 space-y-8">
      <header className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/?lang=${lang}`} className="flex items-center gap-3 text-inherit no-underline">
            <Image
              src="/yapanolur-logo.png"
              alt="yapanolur.com"
              width={200}
              height={48}
              className="h-10 w-auto max-w-[200px] object-contain object-left"
            />
            <span className="text-lg font-semibold tracking-tight">Mühendisİlan</span>
          </Link>
          <HomeBackButtonLink href={`/?lang=${lang}`}>
            {lang === "tr" ? "Ana Sayfa" : "Home"}
          </HomeBackButtonLink>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
      </header>

      <article className="glass-card rounded-2xl p-6 space-y-4 text-sm leading-relaxed text-slate-700">
        {children}
      </article>
    </main>
  );
}
