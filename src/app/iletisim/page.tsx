import StaticSitePage from "@/components/StaticSitePage";
import { getPublicLegalEntity, hasLegalEntityEnvDetails } from "@/lib/legalEntity";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function IletisimPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "İletişim" : "Contact";

  const adminSettings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const legal = getPublicLegalEntity();
  const showLegal = hasLegalEntityEnvDetails(legal);

  return (
    <StaticSitePage lang={lang} title={title}>
      <p>
        {lang === "tr"
          ? "Sorularınız, KVKK başvurularınız ve destek talepleriniz için aşağıdaki iletişim bilgisini kullanabilirsiniz."
          : "Use the contact details below for questions, KVKK-related requests, and support."}
      </p>
      {showLegal ? (
        <div className="space-y-2 rounded-xl border border-orange-200/90 bg-orange-50/40 p-4 text-sm leading-relaxed text-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-900/80">
            {lang === "tr" ? "Veri sorumlusu (ortam yapılandırması)" : "Data controller (environment)"}
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
              <strong>{lang === "tr" ? "MERSİS:" : "MERSIS:"}</strong> {legal.mersis}
            </p>
          ) : null}
          {legal.kvkkEmail ? (
            <p>
              <strong>{lang === "tr" ? "KVKK e-posta:" : "KVKK e-mail:"}</strong>{" "}
              <a className="font-medium text-orange-800 underline" href={`mailto:${legal.kvkkEmail}`}>
                {legal.kvkkEmail}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="rounded-xl border border-orange-200 bg-white/80 p-4 font-medium text-slate-800">
        {adminSettings.homeFooterContact}
      </p>
      <p className="text-slate-600">
        {lang === "tr"
          ? "Üstteki hukuki kimlik bilgileri üretim ortamında LEGAL_ENTITY_* değişkenleriyle tanımlanır; iletişim satırı yönetici panelinden düzenlenir."
          : "Legal identity fields come from LEGAL_ENTITY_* environment variables; the contact line is edited in admin settings."}
      </p>
    </StaticSitePage>
  );
}
