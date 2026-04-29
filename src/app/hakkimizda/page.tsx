import StaticSitePage from "@/components/StaticSitePage";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function HakkimizdaPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Hakkımızda" : "About";

  return (
    <StaticSitePage lang={lang} title={title}>
      {lang === "tr" ? (
        <>
          <p>
            Mühendisİlan, mühendislik, şehir planlama, inşaat ve renovasyon alanlarında ilan verenler ile
            teklif veren kullanıcıları bir araya getiren çok satıcılı bir platformdur.
          </p>
          <p>
            Amacımız; projelerin şeffaf şekilde ilan edilmesi, tekliflerin gerçek zamanlı takibi ve
            güvenilir bir deneyim sunmaktır.
          </p>
        </>
      ) : (
        <>
          <p>
            Mühendisİlan is a multivendor platform connecting advertisers in engineering, urban planning,
            construction, and renovation with users who place bids.
          </p>
          <p>
            We aim for transparent listings, real-time bid tracking, and a reliable experience for everyone
            involved.
          </p>
        </>
      )}
    </StaticSitePage>
  );
}
