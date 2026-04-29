/** Varsayılan dört ana kategori (üst düzey, parentId yok). */
export const DEFAULT_MAIN_CATEGORY_NAMES = [
  "MÜHENDİSLİK PROJELERİ",
  "ŞEHİR PLANLAMA PROJELERİ",
  "İNŞAAT YAPIM PROJELERİ",
  "İNŞAAT TADİLAT PROJELERİ",
] as const;

/** Eski İngilizce kök isimlerinden Türkçe adlara tek seferlik eşleme (mevcut veritabanları için). */
export const LEGACY_MAIN_CATEGORY_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ["Engineering Projects", "MÜHENDİSLİK PROJELERİ"],
  ["Urban Planning Projects", "ŞEHİR PLANLAMA PROJELERİ"],
  ["Construction Projects", "İNŞAAT YAPIM PROJELERİ"],
  ["Construction and Renovation Projects", "İNŞAAT TADİLAT PROJELERİ"],
];
