import Link from "next/link";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  className?: string;
};

export default function SiteFooterNav({ lang, className = "" }: Props) {
  const q = `lang=${lang}`;
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-slate-700 ${className}`}
      aria-label={lang === "tr" ? "Alt bilgi bağlantıları" : "Footer links"}
    >
      <Link href={`/hakkimizda?${q}`} className="hover:text-orange-700 hover:underline">
        {lang === "tr" ? "Hakkımızda" : "About"}
      </Link>
      <Link href={`/site-haritasi?${q}`} className="hover:text-orange-700 hover:underline">
        {lang === "tr" ? "Site Haritası" : "Sitemap"}
      </Link>
      <Link href={`/iletisim?${q}`} className="hover:text-orange-700 hover:underline">
        {lang === "tr" ? "İletişim" : "Contact"}
      </Link>
      <Link href={`/kvkk?${q}`} className="hover:text-orange-700 hover:underline">
        {lang === "tr" ? "KVKK" : "Privacy"}
      </Link>
      <Link href={`/cerez-politikasi?${q}`} className="hover:text-orange-700 hover:underline">
        {lang === "tr" ? "Çerezler" : "Cookies"}
      </Link>
    </nav>
  );
}
