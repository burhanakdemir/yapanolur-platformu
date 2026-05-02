import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function AdminPanelRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const lang = params.lang === "en" ? "en" : "tr";

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4 rounded-2xl bg-orange-50">
      <section className="glass-card rounded-2xl p-6 space-y-3">
      <h1 className="text-3xl font-bold">Yonetici Paneli</h1>
      <p className="text-sm text-orange-800">
        Kategori yonetimi, odeme yonetimi ve ilan onay islemleri buradan yapilir.
      </p>
      <Link className="btn-primary inline-block" href={`${adminUrl()}?lang=${lang}`}>
        Yonetici paneline git
      </Link>
      </section>
    </main>
  );
}
