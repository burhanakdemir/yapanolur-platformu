import StaticSitePage from "@/components/StaticSitePage";
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

  return (
    <StaticSitePage lang={lang} title={title}>
      <p>
        {lang === "tr"
          ? "Sorularınız ve destek talepleriniz için aşağıdaki iletişim bilgisini kullanabilirsiniz."
          : "Use the contact details below for questions and support requests."}
      </p>
      <p className="rounded-xl border border-orange-200 bg-white/80 p-4 font-medium text-slate-800">
        {adminSettings.homeFooterContact}
      </p>
      <p className="text-slate-600">
        {lang === "tr"
          ? "Yönetici panelinden ayarlanan iletişim metni burada gösterilir."
          : "This line reflects the contact text configured in admin settings."}
      </p>
    </StaticSitePage>
  );
}
