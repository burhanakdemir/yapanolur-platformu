import Link from "next/link";
import { HOME_MAIN_CATEGORY_TILE_SIDEBAR } from "@/lib/homeMainCategoryTileClass";
import { dictionary, type Lang } from "@/lib/i18n";

const MAIN_CATEGORY_KEYS = [
  "ENGINEERING_PROJECTS",
  "URBAN_PLANNING_PROJECTS",
  "CONSTRUCTION_PROJECTS",
  "CONSTRUCTION_AND_RENOVATION_PROJECTS",
] as const;

/**
 * Ana sayfa sağ sütun: dört ana kategori + "İlan ver" CTA.
 * `newAdHref` verilmezse `/ads/new` (middleware oturumsuz kullanıcıyı yönlendirir).
 */
export default function HomePostListingStrip({
  lang,
  newAdHref: newAdHrefProp,
}: {
  lang: Lang;
  /** Oturumlu üye: `/ads/new`; değilse `/members?next=...` */
  newAdHref?: string;
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

      <div className="mt-2 flex justify-center sm:mt-2.5">
        <Link
          href={newAdHref}
          className="home-post-listing-cta-glow btn-primary inline-flex min-h-[44px] min-w-[11.5rem] touch-manipulation items-center justify-center rounded-lg px-7 py-2.5 text-sm font-semibold shadow-md transition hover:opacity-95 active:scale-[0.98] sm:min-h-[44px] sm:min-w-[13rem] sm:rounded-xl sm:px-8 sm:py-2.5"
        >
          {t.home.postListingCta}
        </Link>
      </div>
    </div>
  );
}
