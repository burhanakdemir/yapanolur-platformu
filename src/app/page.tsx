import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import {
  DatabaseConnectionError,
  isLikelyDatabaseConnectionError,
  isLikelyPrismaSchemaColumnMissing,
} from "@/lib/dbErrors";
import { ensureDefaultTopCategories, getCategoryTreeCached, getDescendantIds } from "@/lib/categories";
import DbConnectionRequired from "@/components/DbConnectionRequired";
import AuctionsTabs from "@/components/AuctionsTabs";
import { BRAND_LOGO_PATH } from "@/lib/brand";
import { getAppUrl } from "@/lib/appUrl";
import { dictionary, getLang } from "@/lib/i18n";
import { homeSearchMetaStrings, siteName } from "@/lib/metadataHelpers";
import SearchFilters from "@/components/SearchFilters";
import EngineerSearch from "@/components/EngineerSearch";
import HomeHeaderActions from "@/components/HomeHeaderActions";
import HomePostListingStrip from "@/components/HomePostListingStrip";
import HomeHeroMarqueeStrip from "@/components/HomeHeroMarqueeStrip";
import { fetchActiveHomeHeroSlides, toHomeHeroSlidePayload } from "@/lib/homeHeroSlidesQuery";
import { findManyAuctionsShowcaseFirst, HOME_AUCTIONS_LIMIT } from "@/lib/auctionListing";
import { serializeAuctionForHomeList } from "@/lib/serializeHomeAuction";

/** Kategori agaci her istekte veritabanindan okunur (yonetim paneli ile ayni kaynak). */
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    categoryId?: string;
    tab?: string;
    lang?: string;
    province?: string;
    district?: string;
    neighborhood?: string;
  }>;
};

type CategoryTreeNode = {
  id: string;
  name: string;
  children: CategoryTreeNode[];
};

function flattenCategories(
  nodes: CategoryTreeNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((n) => [{ id: n.id, name: n.name, depth }, ...flattenCategories(n.children, depth + 1)]);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const lang = getLang(sp.lang);
  const t = dictionary[lang];
  const tab = (sp.tab === "upcoming" || sp.tab === "expired" ? sp.tab : "live") as
    | "live"
    | "upcoming"
    | "expired";
  const categoryId = sp.categoryId?.trim();
  const province = sp.province?.trim();
  const district = sp.district?.trim();
  const neighborhood = sp.neighborhood?.trim();

  const base = getAppUrl().replace(/\/+$/, "");
  const q = new URLSearchParams();
  if (categoryId) q.set("categoryId", categoryId);
  if (tab !== "live") q.set("tab", tab);
  if (lang === "en") q.set("lang", "en");
  if (province) q.set("province", province);
  if (district) q.set("district", district);
  if (neighborhood) q.set("neighborhood", neighborhood);
  const qs = q.toString();
  const canonical = qs ? `${base}/?${qs}` : `${base}/`;

  try {
    const prisma = getPrismaClient();
    let category: { name: string; parent: { name: string } | null } | null = null;
    if (categoryId) {
      category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true, parent: { select: { name: true } } },
      });
    }

    const site = siteName(lang);

    if (categoryId && !category) {
      return {
        title: lang === "en" ? `Category not found · ${site}` : `Kategori bulunamadı · ${site}`,
        robots: { index: false, follow: true },
        alternates: { canonical },
      };
    }

    const hasFilters = !!(category || tab !== "live" || province || district || neighborhood);

    if (!hasFilters && lang === "en") {
      return {
        title: t.siteTitle,
        description: t.siteDescription,
        alternates: { canonical: `${base}/?lang=en` },
        openGraph: {
          title: t.siteTitle,
          description: t.siteDescription,
          url: `${base}/?lang=en`,
          siteName: site,
          locale: "en_GB",
          type: "website",
        },
        twitter: {
          card: "summary",
          title: t.siteTitle,
          description: t.siteDescription,
        },
      };
    }

    if (!hasFilters && lang === "tr") {
      return {
        alternates: { canonical: `${base}/` },
      };
    }

    const { title, description } = homeSearchMetaStrings(
      lang,
      tab,
      t.siteTitle,
      t.siteDescription,
      category,
      { province, district, neighborhood },
    );

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: site,
        locale: lang === "en" ? "en_GB" : "tr_TR",
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (e) {
    /** DB kapalıyken metadata ayrı süreçte patlamasın; sayfa DbConnectionRequired gösterir. */
    if (isLikelyDatabaseConnectionError(e)) {
      return {
        title: t.siteTitle,
        description: t.siteDescription,
        alternates: { canonical: lang === "en" ? `${base}/?lang=en` : `${base}/` },
      };
    }
    throw e;
  }
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const t = dictionary[lang];
  const tab = (params.tab === "upcoming" || params.tab === "expired" ? params.tab : "live") as
    | "live"
    | "upcoming"
    | "expired";

  try {
    const prisma = getPrismaClient();
    await ensureDefaultTopCategories();
    const categoryTree = await getCategoryTreeCached();

    const now = new Date();
    const province = params.province?.trim() || undefined;
    const district = params.district?.trim() || undefined;
    const neighborhood = params.neighborhood?.trim() || undefined;
    const categoryIdParam = params.categoryId?.trim() || undefined;
    /** Üst kategori seçilince: o kategori + tüm alt kategori ID’leri (ilanlar çoğunlukla yaprak kategoride). */
    const categoryFilter = categoryIdParam
      ? { categoryId: { in: await getDescendantIds(categoryIdParam) } }
      : {};

    const initialAuctions = await findManyAuctionsShowcaseFirst(
      prisma,
      {
        ...(tab === "upcoming"
          ? { status: "PENDING" as const }
          : tab === "expired"
            ? { status: "APPROVED" as const, auctionEndsAt: { lte: now } }
            : { status: "APPROVED" as const, OR: [{ auctionEndsAt: null }, { auctionEndsAt: { gt: now } }] }),
        ...categoryFilter,
        ...(province ? { province: { contains: province } } : {}),
        ...(district ? { district: { contains: district } } : {}),
        ...(neighborhood ? { neighborhood: { contains: neighborhood } } : {}),
      },
      HOME_AUCTIONS_LIMIT,
      tab,
    );

    let adminSettings = await prisma.adminSettings.findUnique({ where: { id: "singleton" } });
    if (!adminSettings) {
      adminSettings = await prisma.adminSettings.create({ data: { id: "singleton" } });
    }
    const serializedInitialAuctions = initialAuctions.map((a) => serializeAuctionForHomeList(a));
    /** İstemci kartlarında Date.now() sapmasını önlemek için tek kaynak zaman damgası */
    const hydrationNowMs = Date.now();
    const flatCategories = flattenCategories(categoryTree as CategoryTreeNode[]);

    const heroSlidesRaw = await fetchActiveHomeHeroSlides(lang);
    const heroSlides = toHomeHeroSlidePayload(heroSlidesRaw);
    const fallbackHeroTitle =
      lang === "tr"
        ? adminSettings.homeHeroTitleTr || t.home.heroTitle
        : adminSettings.homeHeroTitleEn || t.home.heroTitle;
    const fallbackHeroSubtitle =
      lang === "tr"
        ? adminSettings.homeHeroSubtitleTr || t.home.heroSubtitle
        : adminSettings.homeHeroSubtitleEn || t.home.heroSubtitle;
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    const showHeroAuthLinks = !session;
    const adsNewHref = lang === "en" ? "/ads/new?lang=en" : "/ads/new";
    const homePostListingAdHref =
      session?.role === "MEMBER"
        ? adsNewHref
        : `/members?${new URLSearchParams({ next: adsNewHref, ...(lang === "en" ? { lang: "en" } : {}) }).toString()}`;

    return (
    <main className="mx-auto w-full max-w-7xl space-y-2 px-3 pt-4 pb-[max(1.25rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] sm:space-y-3 sm:px-6 sm:pt-6 sm:pb-[max(1.75rem,calc(1rem+env(safe-area-inset-bottom,0px)))]">
      <div className="space-y-6">
        <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex shrink-0 items-center gap-4">
            <Image
              src={BRAND_LOGO_PATH}
              alt="yapanolur.com"
              width={440}
              height={113}
              className="h-16 w-auto max-w-[min(100%,280px)] object-contain object-left sm:h-20 sm:max-w-[min(100%,360px)] md:h-28 md:max-w-[min(100%,520px)]"
              priority
            />
          </div>
          <HomeHeaderActions
            lang={lang}
            query={{
              categoryId: params.categoryId,
              tab: params.tab,
              lang: params.lang,
              province: params.province,
              district: params.district,
              neighborhood: params.neighborhood,
            }}
          />
        </header>

        <HomeHeroMarqueeStrip lang={lang} slides={heroSlides} title={fallbackHeroTitle} subtitle={fallbackHeroSubtitle} />
      </div>

      <section className="grid max-lg:gap-5 gap-4 lg:grid-cols-[280px_1fr] lg:items-stretch">
        {/* Mobilde ilanlar önce: sıra lg’de normale döner */}
        <aside className="home-sidebar-panel order-2 space-y-2 rounded-2xl p-3 sm:space-y-2.5 lg:order-1">
          <div id="proje-arama" className="scroll-mt-24 space-y-2">
            <h3 className="text-sm font-semibold leading-tight text-orange-950">
              {lang === "tr" ? "İlan Ara" : "Search listings"}
            </h3>
            <SearchFilters
              lang={lang}
              categories={flatCategories}
              initial={{
                categoryId: params.categoryId,
                province: params.province,
                district: params.district,
                neighborhood: params.neighborhood,
              }}
            />
          </div>

          <div className="space-y-2 border-t border-orange-200/80 pt-2">
            <h3 className="text-sm font-semibold leading-tight text-orange-950">
              {lang === "tr" ? "Meslek Sahibi Ara" : "Find professionals"}
            </h3>
            <EngineerSearch
              lang={lang}
              basePath="/muhendis-ara"
              mergeSearchParams={false}
              initial={{}}
            />
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold leading-tight text-slate-800">
              {lang === "tr" ? "Ana ve Alt Kategori İlanları" : "Main & subcategory listings"}
            </h4>
            <div className="space-y-1">
              {categoryTree.map((cat) => (
                <CategoryTreeLink key={cat.id} node={cat} lang={lang} params={params} />
              ))}
            </div>
          </div>
        </aside>

        {/* İlan ver şeridi + liste: yükseklik liste için; kartlar responsive sütun (2/3/4). */}
        <div className="order-1 flex h-full min-h-0 min-w-0 flex-col gap-3 sm:gap-4 lg:order-2">
          <HomePostListingStrip
            lang={lang}
            newAdHref={homePostListingAdHref}
            guestAuth={
              showHeroAuthLinks
                ? {
                    loginHref: lang === "en" ? "/login?lang=en" : "/login",
                    registerHref: lang === "en" ? "/members?lang=en" : "/members",
                    loginLabel: t.home.sidebarGuestLogin,
                    registerLabel: t.home.sidebarGuestRegister,
                  }
                : null
            }
          />
          <div className="home-sidebar-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl p-3 sm:p-4 h-[min(70vh,calc(100dvh-6rem))] max-h-[min(85vh,calc(100dvh-5rem))] md:h-[min(92vh,calc(100dvh-4rem))] md:max-h-[min(92vh,calc(100dvh-4rem))] lg:h-[min(1284px,calc(100dvh-8rem))] lg:max-h-[min(1284px,calc(100dvh-8rem))]">
            <AuctionsTabs
              initialTab={tab}
              initialAuctions={serializedInitialAuctions}
              filters={{
                categoryId: params.categoryId,
                province: params.province,
                district: params.district,
                neighborhood: params.neighborhood,
                lang,
              }}
              lang={lang}
              hydrationNowMs={hydrationNowMs}
            />
          </div>
        </div>
      </section>

    </main>
    );
  } catch (e) {
    if (e instanceof DatabaseConnectionError || isLikelyDatabaseConnectionError(e)) {
      return <DbConnectionRequired />;
    }
    console.error("[home] veritabani veya sorgu hatasi:", e);
    if (isLikelyPrismaSchemaColumnMissing(e)) {
      return (
        <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col justify-center gap-4 p-6">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
            <h1 className="text-lg font-bold text-amber-950">Veritabanı şeması dosyayla uyumsuz</h1>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/95">
              PostgreSQL şeması kodla uyumsuz. Önce migration uygulayın:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-800">
              npx prisma migrate deploy
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-amber-800/90">
              Geliştirmede şemayı hızlı eşitlemek için (dikkatli kullanın):{" "}
              <code className="rounded bg-white px-1">npx prisma db push</code>
            </p>
            <p className="mt-3 text-xs text-amber-800/90">Sonra geliştirme sunucusunu yeniden başlatın.</p>
          </div>
        </main>
      );
    }
    throw e;
  }
}

function CategoryTreeLink({
  node,
  lang,
  params,
  depth = 0,
}: {
  node: CategoryTreeNode;
  lang: "tr" | "en";
  params: {
    categoryId?: string;
    tab?: string;
    lang?: string;
    province?: string;
    district?: string;
    neighborhood?: string;
  };
  depth?: number;
}) {
  const q = new URLSearchParams();
  q.set("lang", lang);
  q.set("categoryId", node.id);
  if (params.tab) q.set("tab", params.tab);
  if (params.province) q.set("province", params.province);
  if (params.district) q.set("district", params.district);
  if (params.neighborhood) q.set("neighborhood", params.neighborhood);

  const isRoot = depth === 0;
  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-1 group max-lg:space-y-1.5">
      <Link
        href={`/?${q.toString()}`}
        className={
          isRoot
            ? "flex min-h-[44px] w-full items-center rounded-lg border border-[#004a99] bg-[#004a99] py-3 pr-2.5 text-left text-sm font-bold leading-tight text-white shadow-sm transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-white active:opacity-95 md:min-h-0 md:py-1.5 touch-manipulation"
            : "flex min-h-[44px] w-full items-center rounded-lg border border-sky-200/90 bg-sky-50 py-2.5 pr-2.5 text-left text-sm font-normal leading-tight text-slate-700 shadow-sm transition-colors hover:border-orange-500 hover:bg-orange-500 hover:text-white active:opacity-95 md:min-h-0 md:py-1 touch-manipulation"
        }
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {node.name}
      </Link>
      {hasChildren ? (
        <div className="hidden w-full space-y-1 group-hover:block group-focus-within:block max-md:block max-md:space-y-1.5">
          {node.children.map((child) => (
            <CategoryTreeLink key={child.id} node={child} lang={lang} params={params} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
