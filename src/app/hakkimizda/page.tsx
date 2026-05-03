import type { ReactNode } from "react";
import Image from "next/image";
import StaticSitePage from "@/components/StaticSitePage";
import { getLang } from "@/lib/i18n";
type Props = {
  searchParams: Promise<{ lang?: string }>;
};

function websiteHostLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function FirmCard({
  title,
  tagline,
  logoSrc,
  logoAlt,
  websiteHref,
  linkLabel,
  children,
}: {
  title: string;
  tagline: string;
  logoSrc: string;
  logoAlt: string;
  websiteHref: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-orange-200/80 bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex min-h-[5.5rem] items-center justify-center border-b border-orange-100/90 pb-4">
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center justify-center rounded-md outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={220}
            height={100}
            sizes="(max-width: 1024px) 85vw, 200px"
            className="h-auto max-h-20 w-full max-w-[200px] object-contain"
          />
        </a>
      </div>
      <h2 className="text-base font-semibold leading-snug text-orange-950">{title}</h2>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-orange-800/90">{tagline}</p>
      <div className="mt-4 flex flex-1 flex-col gap-3 text-sm leading-relaxed text-slate-700">{children}</div>
      <a
        href={websiteHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex flex-wrap items-baseline gap-x-1.5 break-all text-sm font-semibold text-orange-700 hover:text-orange-800 hover:underline"
        aria-label={`${linkLabel}: ${websiteHostLabel(websiteHref)}`}
      >
        <span aria-hidden>↗</span>
        <span className="font-normal text-slate-600">{linkLabel}:</span>
        {websiteHostLabel(websiteHref)}
      </a>
    </section>
  );
}
export default async function HakkimizdaPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Hakkımızda" : "About";

  return (
    <StaticSitePage lang={lang} title={title}>
      {lang === "tr" ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Tanıtım sırası sabittir: jeoteknik ve inşaat mühendisliği çizgisinden zemin etüdü ve sahaya,
            ardından laboratuvar odaklı mühendislik desteğine.
          </p>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-5">
            <FirmCard
              title="Geosis Jeoteknik Mimarlık Mühendislik Ltd. Şti."
              tagline="İnşaat ve mühendislik projelerinde teknik çözüm ortağı"
              logoSrc="/hakkimizda/geosis-logo.png"
              logoAlt="Geosis Jeoteknik logo"
              websiteHref="https://geosisjeoteknik.com/"
              linkLabel="Web sitesi"
            >
              <p>
                İnşaat ve yapı yatırımlarında jeoteknik ve mimari mühendislik bileşenleriyle çalışan bir
                mühendislik anlayışıyla hareket eder. Projelerde taşıyıcı sistem ve zemin karşılığını birlikte
                düşünerek riskleri erken aşamada görünür kılmayı hedefler.
              </p>
              <p>
                Zemin–temel uyumu, sahaya özgü jeoteknik değerlendirme ve gerektiğinde laboratuvar /
                ölçüm verisiyle desteklenen teknik çıktılar üretilir; iddiasız, raporlanabilir bir mühendislik
                dili benimsenir.
              </p>
            </FirmCard>

            <FirmCard
              title="Jeo Yapı Harita Mimarlık Mühendislik Ltd. Şti."
              tagline="Zemin etüdü ve saha araştırmaları"
              logoSrc="/hakkimizda/jeoyapi-logo.png"
              logoAlt="Jeo Yapı logo"
              websiteHref="https://www.jeoyapi.com/"
              linkLabel="Web sitesi"
            >
              <p>
                Zemin etüdü, sondaj ve jeofizik ölçümler üzerinden sahayı okuyarak projeye özgü zemin modeli
                çıkarır. Baraj, gölet, HES ve benzeri su yapıları ile enerji altyapılarında zemin araştırması
                ve teknik raporlama çizgisinde çalışır.
              </p>
              <p>
                Harita ve mühendislik koordinasyonuyla ölçü ve veri üretimini bir arada düşünür; sahada
                toplanan bilginin rapora aktarılmasında şeffaf ve izlenebilir bir süreç önemser.
              </p>
            </FirmCard>

            <FirmCard
              title="ACD Zemin Mühendislik Laboratuvar Hizmetleri"
              tagline="Zemin ve kaya mekaniği laboratuvar analizleri"
              logoSrc="/hakkimizda/acd-logo.png"
              logoAlt="ACD Zemin Laboratuvar logo"
              websiteHref="https://www.acdzeminlab.com/"
              linkLabel="Web sitesi"
            >
              <p>
                Zemin ve kaya mekaniği laboratuvar deneyleri ile projeler için güvenilir parametre üretir.
                İnşaat mühendisliği kararlarına temel olan malzeme ve zemin özellikleri ölçülür; sonuçlar
                teknik dosyalarda kullanılabilecek biçimde dokümante edilir.
              </p>
              <p>
                Saha ile laboratuvar bulgularının birbirini tamamlamasına odaklanır; mühendislik
                danışmanlığı çizgisinde kalite ve tekrarlanabilir ölçüm süreçlerini öne çıkarır.
              </p>
            </FirmCard>
          </div>

          <p className="text-xs text-slate-500">
            Güncel iletişim ve ticari unvan bilgileri için ilgili firmanın resmi kanallarına başvurun.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Order is fixed: geotechnical and construction engineering, then ground investigation and field
            studies, then laboratory-focused engineering support.
          </p>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-5">
            <FirmCard
              title="Geosis Jeoteknik Mimarlık Mühendislik Ltd. Şti."
              tagline="Technical solutions for construction and engineering projects"
              logoSrc="/hakkimizda/geosis-logo.png"
              logoAlt="Geosis Jeoteknik logo"
              websiteHref="https://geosisjeoteknik.com/"
              linkLabel="Website"
            >
              <p>
                Works across geotechnical and architectural engineering for building and infrastructure
                investments. Structural behaviour and ground response are considered together so that risks
                can be surfaced early in design and procurement.
              </p>
              <p>
                Deliverables combine foundation–ground compatibility, site-specific geotechnical assessment,
                and measurement or laboratory input where needed—without overstated claims, with reportable
                engineering judgement.
              </p>
            </FirmCard>

            <FirmCard
              title="Jeo Yapı Harita Mimarlık Mühendislik Ltd. Şti."
              tagline="Ground investigation and field studies"
              logoSrc="/hakkimizda/jeoyapi-logo.png"
              logoAlt="Jeo Yapı logo"
              websiteHref="https://www.jeoyapi.com/"
              linkLabel="Website"
            >
              <p>
                Reads the site through geotechnical studies, drilling, and geophysical surveys to build a
                project-specific ground model. Supports embankments, reservoirs, HPP-type projects, and energy
                infrastructure with ground investigation and technical reporting.
              </p>
              <p>
                Coordinates surveying and engineering inputs; emphasizes transparent, traceable paths from field
                data to deliverables.
              </p>
            </FirmCard>

            <FirmCard
              title="ACD Zemin Mühendislik Laboratuvar Hizmetleri"
              tagline="Soil and rock mechanics laboratory testing"
              logoSrc="/hakkimizda/acd-logo.png"
              logoAlt="ACD Zemin laboratory logo"
              websiteHref="https://www.acdzeminlab.com/"
              linkLabel="Website"
            >
              <p>
                Produces dependable parameters through soil and rock mechanics laboratory testing for civil
                engineering decisions. Material and ground properties are measured and documented so results
                can be referenced in technical submissions.
              </p>
              <p>
                Focuses on aligning field observations with laboratory findings and on repeatable measurement
                practice within an engineering advisory mindset.
              </p>
            </FirmCard>
          </div>

          <p className="text-xs text-slate-500">
            For current contact details and registered trade names, please refer to each company&apos;s
            official channels.
          </p>
        </div>
      )}
    </StaticSitePage>
  );
}
