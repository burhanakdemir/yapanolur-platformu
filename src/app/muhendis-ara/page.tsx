import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import { prisma } from "@/lib/prisma";
import EngineerSearch from "@/components/EngineerSearch";
import EngineerDirectoryResults from "@/components/EngineerDirectoryResults";
import { findPublicEngineers } from "@/lib/engineerDirectory";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{
    lang?: string;
    engProvince?: string;
    engDistrict?: string;
    engProfessionId?: string;
  }>;
};

export default async function MuhendisAraPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const engProvince = params.engProvince?.trim() || undefined;
  const engDistrict = params.engDistrict?.trim() || undefined;
  const engProfessionId = params.engProfessionId?.trim() || undefined;
  const searchActive = Boolean(engProvince || engDistrict || engProfessionId);

  const engineers = searchActive
    ? await findPublicEngineers(prisma, {
        province: engProvince,
        district: engDistrict,
        professionId: engProfessionId,
      })
    : [];

  const homeHref = `/?${new URLSearchParams({ lang }).toString()}`;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <HomeBackButtonLink href={homeHref}>
        {lang === "tr" ? "← Ana sayfa" : "← Home"}
      </HomeBackButtonLink>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-orange-950 md:text-3xl">
          {lang === "tr" ? "Meslek Sahibi Ara" : "Find professionals"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {lang === "tr"
            ? "Onaylı üyeler arasında il, ilçe ve mesleğe göre arayın."
            : "Search approved members by province, district, and profession."}
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <EngineerSearch
          key={[engProvince ?? "", engDistrict ?? "", engProfessionId ?? ""].join("|")}
          lang={lang}
          basePath="/muhendis-ara"
          mergeSearchParams
          initial={{
            province: engProvince,
            district: engDistrict,
            professionId: engProfessionId,
          }}
        />
      </div>

      {searchActive ? (
        <EngineerDirectoryResults engineers={engineers} lang={lang} />
      ) : (
        <p className="rounded-xl border border-orange-200/80 bg-orange-50/40 px-4 py-3 text-sm text-slate-700">
          {lang === "tr"
            ? "En az bir kriter seçip Ara ile sonuçları görüntüleyin."
            : "Select at least one filter and press Search to see results."}
        </p>
      )}
    </main>
  );
}
