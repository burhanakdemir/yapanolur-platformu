import Link from "next/link";
import StaticSitePage from "@/components/StaticSitePage";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import { getLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

const SITEMAP_AD_LINKS = 80;

export default async function SiteHaritasiPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Site Haritası" : "Sitemap";
  const q = `lang=${lang}`;

  let approvedAds: { id: string; title: string; listingNumber: number }[] = [];
  try {
    approvedAds = await prisma.ad.findMany({
      where: { status: "APPROVED" },
      select: { id: true, title: true, listingNumber: true },
      orderBy: { updatedAt: "desc" },
      take: SITEMAP_AD_LINKS,
    });
  } catch {
    approvedAds = [];
  }

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

      {approvedAds.length > 0 ? (
        <div className="border-t border-orange-100/90 pt-6">
          <h2 className="mb-3 text-base font-semibold text-orange-950">
            {lang === "tr" ? "Yayındaki ilanlar (örnek)" : "Published listings (sample)"}
          </h2>
          <p className="mb-3 text-slate-600">
            {lang === "tr"
              ? "Arama motorlarının iç bağlantıları keşfetmesi için son güncellenen ilanlar."
              : "Recently updated listings for crawlers to discover internal links."}
          </p>
          <ul className="list-none space-y-2 p-0">
            {approvedAds.map((ad) => {
              const href = lang === "en" ? `/ads/${ad.id}?lang=en` : `/ads/${ad.id}`;
              const label = `${displayAdTitle(ad.title)} · №${ad.listingNumber}`;
              return (
                <li key={ad.id}>
                  <Link href={href} className="text-orange-800 hover:underline">
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </StaticSitePage>
  );
}
