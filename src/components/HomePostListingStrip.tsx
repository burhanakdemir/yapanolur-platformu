import Link from "next/link";
import HomePwaInstallCta from "@/components/HomePwaInstallCta";
import { HOME_MAIN_CATEGORY_TILE_SIDEBAR, HOME_SIDEBAR_CTA_TILE } from "@/lib/homeMainCategoryTileClass";
import { dictionary, type Lang } from "@/lib/i18n";

const MAIN_CATEGORY_KEYS = [
  "ENGINEERING_PROJECTS",
  "URBAN_PLANNING_PROJECTS",
  "CONSTRUCTION_PROJECTS",
  "CONSTRUCTION_AND_RENOVATION_PROJECTS",
] as const;

/** Üst `ul` ile aynı gap: mobil gap-1 (2 aralık), sm gap-1.5 (4 sütunda 3 aralık) */
const CTA_WIDTH_3_MAX_SM = "max-sm:!w-[calc((100%-0.5rem)/3)]";
const CTA_WIDTH_TILE_SM = "sm:!w-[calc((100%-1.125rem)/4)]";
const CTA_WIDTH_SINGLE_SM = "sm:!w-[calc((100%-1.125rem)/4)]";

/** `globals.css` — Canlı destek FAB ile aynı parlama ( reduced-motion’da animasyon kapalı ) */
const CTA_GLOW = "home-post-listing-cta-glow";

/**
 * Ana sayfa sağ sütun: dört ana kategori + "İlan ver" CTA (+ oturum yoksa giriş / kayıt).
 * `newAdHref` verilmezse `/ads/new` (middleware oturumsuz kullanıcıyı yönlendirir).
 */
export default function HomePostListingStrip({
  lang,
  newAdHref: newAdHrefProp,
  guestAuth,
}: {
  lang: Lang;
  /** Oturumlu üye: `/ads/new`; değilse `/members?next=...` */
  newAdHref?: string;
  /** Oturum yoksa İlan ver düğmesinin sağında gösterilir */
  guestAuth?: {
    loginHref: string;
    registerHref: string;
    loginLabel: string;
    registerLabel: string;
  } | null;
}) {
  const t = dictionary[lang];
  const newAdHref = newAdHrefProp ?? (lang === "en" ? "/ads/new?lang=en" : "/ads/new");

  return (
    <div className="home-sidebar-panel shrink-0 rounded-2xl border border-orange-300/50 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/80 px-2 py-2 shadow-sm sm:px-3 sm:py-2.5">
      <ul
        className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-1.5"
        aria-label={lang === "tr" ? "Ana kategori başlıkları" : "Main category headings"}
      >
        {MAIN_CATEGORY_KEYS.map((key) => (
          <li
            key={key}
            className={`${HOME_MAIN_CATEGORY_TILE_SIDEBAR} max-sm:!min-h-[44px] max-sm:!py-2 touch-manipulation`}
          >
            {t.categories[key]}
          </li>
        ))}
      </ul>

      {/* Üst kategori hücresi genişliğiyle hizalı; üçlü grup justify-center ile ortada */}
      <div className="mt-2 flex w-full flex-wrap justify-center gap-1 sm:mt-2 sm:flex-nowrap sm:gap-1.5">
        <Link
          href={newAdHref}
          className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} shrink-0 ${
            guestAuth
              ? `${CTA_WIDTH_3_MAX_SM} ${CTA_WIDTH_TILE_SM}`
              : `max-sm:!w-full ${CTA_WIDTH_SINGLE_SM}`
          }`}
        >
          {t.home.postListingCta}
        </Link>
        {guestAuth ? (
          <>
            <Link
              href={guestAuth.loginHref}
              className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} shrink-0 hidden md:flex ${CTA_WIDTH_3_MAX_SM} ${CTA_WIDTH_TILE_SM}`}
            >
              {guestAuth.loginLabel}
            </Link>
            <HomePwaInstallCta
              lang={lang}
              eligibility="sidebar-guest"
              wrapClassName={`shrink-0 md:hidden ${CTA_WIDTH_3_MAX_SM} ${CTA_WIDTH_TILE_SM} flex min-w-0 justify-center`}
            />
            <Link
              href={guestAuth.registerHref}
              className={`${HOME_SIDEBAR_CTA_TILE} ${CTA_GLOW} shrink-0 ${CTA_WIDTH_3_MAX_SM} ${CTA_WIDTH_TILE_SM}`}
            >
              {guestAuth.registerLabel}
            </Link>
          </>
        ) : null}
      </div>

      {/* Oturumlu üye: mobilde «Uygulamayı indir» (misafir şeridindeki orta sütunla aynı CTA) */}
      {!guestAuth ? (
        <HomePwaInstallCta
          lang={lang}
          eligibility="sidebar-member"
          wrapClassName="mt-2 w-full md:hidden"
        />
      ) : null}
    </div>
  );
}
