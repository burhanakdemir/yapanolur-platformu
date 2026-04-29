/**
 * Ana sayfa üst kategori görünümü: sidebar kutu şeridi ile ilan kartı üst satırı aynı btn-primary stilini paylaşır.
 * Not: line-clamp ile flex aynı elemanda kullanılmaz; kartta block taban kullanılır.
 */
const HOME_MAIN_CATEGORY_TILE_CORE =
  "btn-primary w-full rounded-md leading-tight text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] sm:rounded-lg";

/** Sidebar (HomePostListingStrip) — tek satır, ortalanmış. */
export const HOME_MAIN_CATEGORY_TILE_SIDEBAR = `${HOME_MAIN_CATEGORY_TILE_CORE} flex min-h-[32px] items-center justify-center px-1.5 py-1 text-center text-xs font-semibold sm:min-h-[36px] sm:px-2 sm:py-1.5 sm:text-sm`;

/**
 * İlan kartı — ince şerit; globals .btn-primary padding/font için ! ile sıkıştırma.
 * Sola yaslı, en fazla iki satır; yatay iç boşluk ve punto bir üst kademede (kart için).
 */
export const HOME_MAIN_CATEGORY_TILE_CARD = `${HOME_MAIN_CATEGORY_TILE_CORE} line-clamp-2 min-h-0 min-w-0 !px-[19.5px] !py-1 text-left text-[10px] !font-medium leading-snug sm:!px-[21.5px] sm:!py-1.5 sm:text-[11px]`;
