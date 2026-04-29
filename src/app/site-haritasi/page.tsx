import Link from "next/link";
import StaticSitePage from "@/components/StaticSitePage";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function SiteHaritasiPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Site Haritası" : "Sitemap";
  const q = `lang=${lang}`;

  const items: { href: string; labelTr: string; labelEn: string }[] = [
    { href: `/?${q}`, labelTr: "Ana sayfa", labelEn: "Home" },
    { href: `/login`, labelTr: "Giriş", labelEn: "Login" },
    { href: `/members?${q}`, labelTr: "Üyeler / belgeler", labelEn: "Members / documents" },
    { href: `/muhendis-ara?${q}`, labelTr: "Meslek sahibi ara", labelEn: "Find professionals" },
    { href: `/hakkimizda?${q}`, labelTr: "Hakkımızda", labelEn: "About" },
    { href: `/site-haritasi?${q}`, labelTr: "Site haritası", labelEn: "Sitemap" },
    { href: `/iletisim?${q}`, labelTr: "İletişim", labelEn: "Contact" },
    { href: `/kvkk?${q}`, labelTr: "KVKK — Aydınlatma", labelEn: "Privacy notice" },
    { href: `/cerez-politikasi?${q}`, labelTr: "Çerez politikası", labelEn: "Cookie policy" },
    { href: `/panel/user?${q}`, labelTr: "Kullanıcı paneli", labelEn: "User panel" },
    { href: `/ads/new?${q}`, labelTr: "Yeni ilan", labelEn: "New listing" },
  ];

  return (
    <StaticSitePage lang={lang} title={title}>
      <p className="text-slate-600">
        {lang === "tr"
          ? "Önemli sayfalara hızlı erişim:"
          : "Quick links to main pages:"}
      </p>
      <ul className="list-none space-y-2 p-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-orange-800 hover:underline">
              {lang === "tr" ? item.labelTr : item.labelEn}
            </Link>
          </li>
        ))}
      </ul>
    </StaticSitePage>
  );
}
