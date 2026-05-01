import Link from "next/link";
import type { PublicLegalEntity } from "@/lib/legalEntity";

type Props = {
  lang: "tr" | "en";
  canonicalHost: string;
  legal: PublicLegalEntity;
  /** Site ayarlarından gelen yayımlanan iletişim satırı */
  contactPublished: string;
  iletisimHref: string;
};

export default function DataControllerDisclosure({
  lang,
  canonicalHost,
  legal,
  contactPublished,
  iletisimHref,
}: Props) {
  const hasEnv = Boolean(legal.entityName || legal.address || legal.mersis || legal.kvkkEmail);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        {lang === "tr" ? "2. Veri sorumlusu" : "2. Data controller"}
      </h2>

      <p>
        {lang === "tr" ? (
          <>
            Kişisel verileriniz, 6698 sayılı Kanun kapsamında{" "}
            <strong className="font-semibold text-slate-900">{canonicalHost}</strong> alan adı üzerinden sunulan
            ilan, ihale/teklif ve üyelik hizmetlerinin{" "}
            <strong className="font-semibold text-slate-900">veri sorumlusu</strong> sıfatıyla işlenmektedir.
          </>
        ) : (
          <>
            Your personal data are processed by the <strong className="font-semibold text-slate-900">data
            controller</strong> for the listing, tender/bid and membership services offered at{" "}
            <strong className="font-semibold text-slate-900">{canonicalHost}</strong>, in accordance with Law
            no.&nbsp;6698 (KVKK).
          </>
        )}
      </p>

      {hasEnv ? (
        <div className="space-y-2 rounded-xl border border-orange-200/90 bg-white/90 p-4 text-sm leading-relaxed text-slate-800 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
            {lang === "tr" ? "Kimlik bilgileri (ortam yapılandırması)" : "Identity (environment configuration)"}
          </p>
          {legal.entityName ? (
            <p>
              <strong>{lang === "tr" ? "Ticari unvan:" : "Legal name:"}</strong> {legal.entityName}
            </p>
          ) : null}
          {legal.address ? (
            <p className="whitespace-pre-wrap">
              <strong>{lang === "tr" ? "Adres:" : "Address:"}</strong> {legal.address}
            </p>
          ) : null}
          {legal.mersis ? (
            <p className="tabular-nums">
              <strong>{lang === "tr" ? "MERSİS no:" : "MERSIS:"}</strong> {legal.mersis}
            </p>
          ) : null}
          {legal.kvkkEmail ? (
            <p>
              <strong>{lang === "tr" ? "KVKK başvuru e-postası:" : "KVKK contact e-mail:"}</strong>{" "}
              <a className="font-medium text-orange-800 underline" href={`mailto:${legal.kvkkEmail}`}>
                {legal.kvkkEmail}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 rounded-xl border border-orange-200/90 bg-orange-50/40 p-4 text-sm leading-relaxed text-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
          {lang === "tr" ? "Yayımlanan iletişim bilgisi (site ayarları)" : "Published contact line (site settings)"}
        </p>
        <p className="font-medium text-slate-900">{contactPublished.trim() || "—"}</p>
        <p className="text-xs text-slate-600">
          {lang === "tr"
            ? "Bu metin yönetici panelinden düzenlenir; ticari telefon, e-posta veya destek hattı burada güncel tutulur."
            : "This line is edited in the admin panel and should reflect your current support or legal contact."}
        </p>
      </div>

      <p className="text-sm text-slate-700">
        {lang === "tr" ? (
          <>
            Güncel başvuru ve iletişim kanalları için{" "}
            <Link href={iletisimHref} className="font-medium text-orange-800 underline">
              İletişim
            </Link>{" "}
            sayfasına bakınız. KVKK kapsamındaki haklar ve başvuru usulü bu metnin ilgili bölümlerinde düzenlenmiştir.
          </>
        ) : (
          <>
            See the{" "}
            <Link href={iletisimHref} className="font-medium text-orange-800 underline">
              Contact
            </Link>{" "}
            page for current channels. Your rights and complaint routes are described in the sections below.
          </>
        )}
      </p>
    </section>
  );
}
