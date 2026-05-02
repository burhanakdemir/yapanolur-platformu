import type { AdminPanelMode } from "@/lib/adminRoles";
import { adminUrl } from "@/lib/adminUrls";

/**
 * Yönetici paneli: tek kaynak (üst menü, yan menü, ana sayfa bölümleri).
 */
export type AdminNavSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  /** true: sadece süper yönetici (SUPER_ADMIN) menüde ve sayfada görür */
  superOnly?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  sections: AdminNavSection[];
};

export type AdminQuickLink = {
  href: string;
  label: string;
  superOnly?: boolean;
};

/** Üst hızlı menü + sol sidebar (kısa ve sık kullanılanlar) */
export const ADMIN_QUICK_LINKS: readonly AdminQuickLink[] = [
  { href: adminUrl(), label: "Özet" },
  { href: "/executive", label: "İş özeti", superOnly: true },
  { href: adminUrl("/site-settings"), label: "Site", superOnly: true },
  { href: adminUrl("/home-hero-slides"), label: "Hero slayt" },
  { href: adminUrl("/sponsor-hero"), label: "Sponsor hero", superOnly: true },
  { href: adminUrl("/odeme"), label: "Ödeme", superOnly: true },
  { href: adminUrl("/signup-sms-provider"), label: "Kayıt SMS", superOnly: true },
  { href: adminUrl("/signup-verification"), label: "Kayıt OTP", superOnly: true },
  { href: adminUrl("/ileti-merkezi-json"), label: "İleti SMS", superOnly: true },
  { href: adminUrl("/payments"), label: "Vitrin", superOnly: true },
  { href: adminUrl("/categories"), label: "Kategoriler" },
  { href: adminUrl("/members"), label: "Üyeler" },
  { href: adminUrl("/listings"), label: "İlanlar" },
  { href: adminUrl("/sponsor-purchases"), label: "Sponsor onayı" },
  { href: adminUrl("/ilan-eposta"), label: "İlan e-posta", superOnly: true },
  { href: adminUrl("/bid-settings"), label: "Teklif fiyatı" },
  { href: adminUrl("/bids"), label: "Teklifler" },
  { href: adminUrl("/credit-invoices"), label: "Faturalar" },
  { href: adminUrl("/support"), label: "Canlı destek" },
];

/** Ana panelde gruplu kartlar + arama */
export const ADMIN_SECTION_GROUPS: AdminNavGroup[] = [
  {
    id: "ust-yonetim",
    label: "Üst yönetim",
    sections: [
      {
        id: "executive",
        title: "İş özeti (CEO)",
        description:
          "Kredi, ödeme, ilan ve teklif özetleri; günlük operasyon ayarları bu ekranda yoktur.",
        href: "/executive",
        superOnly: true,
      },
    ],
  },
  {
    id: "site",
    label: "Site & görünüm",
    sections: [
      {
        id: "site-settings",
        title: "Site ayarları",
        description: "Ana sayfa metinleri, butonlar, iletişim satırı ve genel site davranışı.",
        href: adminUrl("/site-settings"),
        superOnly: true,
      },
      {
        id: "home-hero-slides",
        title: "Ana sayfa hero slaytları",
        description: "Üst carousel: duyuru ve sponsor slaytları, sıralama ve zaman aralığı.",
        href: adminUrl("/home-hero-slides"),
      },
      {
        id: "sponsor-hero",
        title: "Ana sayfa sponsor ücreti & üye ekleme",
        description:
          "4–30 gün paket fiyatları; üye numarasıyla TR sponsor satırı ve yayın süresi (süper yönetici).",
        href: adminUrl("/sponsor-hero"),
        superOnly: true,
      },
      {
        id: "sponsor-purchases",
        title: "Sponsorluk onayı",
        description:
          "Üyenin bakiyeden ödediği paketler; onayda yayın başlar, reddedilirse ücret iade edilir.",
        href: adminUrl("/sponsor-purchases"),
      },
      {
        id: "support",
        title: "Canlı destek",
        description: "Ziyaretçi sohbetleri, yanıtlama ve müsaitlik (çevrimiçi bildirim).",
        href: adminUrl("/support"),
      },
    ],
  },
  {
    id: "uyelik",
    label: "Üyelik",
    sections: [
      {
        id: "members",
        title: "Üyelik yönetimi",
        description: "Üye listesi, onay, şifre sıfırlama ve belge kontrolü.",
        href: adminUrl("/members"),
      },
      {
        id: "member-votes",
        title: "Üye beğeni durumu",
        description: "Beğeni / beğenmeme oyları; silme ve inceleme.",
        href: adminUrl("/member-votes"),
      },
      {
        id: "member-comments",
        title: "Üye profil yorumları",
        description: "Ücretli profil yorumlarını listeleyin ve silin.",
        href: adminUrl("/member-comments"),
      },
    ],
  },
  {
    id: "odeme",
    label: "Ödeme & vitrin",
    sections: [
      {
        id: "odeme",
        title: "Ödeme bağlantıları (iyzico & PayTR)",
        description: "API anahtarları, bildirim ve callback URL’leri; kartla kredi entegrasyonu.",
        href: adminUrl("/odeme"),
        superOnly: true,
      },
      {
        id: "signup-sms",
        title: "Kayıt telefon SMS",
        description: "Üye kaydı telefon OTP için HTTP webhook veya Twilio yedek; test gönderimi.",
        href: adminUrl("/signup-sms-provider"),
        superOnly: true,
      },
      {
        id: "signup-verification",
        title: "Kayıt e-posta / telefon OTP",
        description: "Demo için e-posta veya SMS doğrulamasını açıp kapatma (varsayılan: ikisi açık).",
        href: adminUrl("/signup-verification"),
        superOnly: true,
      },
      {
        id: "ileti-json-sms",
        title: "İleti Merkezi JSON SMS",
        description: "Genel SMS: API kullanıcı / şifre / gönderici (panel veya ILETI_MERKEZI_* env).",
        href: adminUrl("/ileti-merkezi-json"),
        superOnly: true,
      },
      {
        id: "payments",
        title: "Vitrin ayarları",
        description: "Vitrin paket fiyatları ve temel vitrin ücreti.",
        href: adminUrl("/payments"),
        superOnly: true,
      },
      {
        id: "credit-invoices",
        title: "Kredi faturaları (e-fatura)",
        description: "Kredi yükleme ödemeleri için bekleyen kesimler ve Sovos / mock akışı.",
        href: adminUrl("/credit-invoices"),
      },
    ],
  },
  {
    id: "katalog",
    label: "Katalog",
    sections: [
      {
        id: "categories",
        title: "Kategori ayarları",
        description: "Ana sayfa, ilan verme ve arama: tüm kategori ağacı (tek veritabanı).",
        href: adminUrl("/categories"),
      },
      {
        id: "professions",
        title: "Meslek ayarları",
        description: "Kayıt formunda seçilecek meslek listesi (ekle / sil).",
        href: adminUrl("/professions"),
      },
    ],
  },
  {
    id: "ilan",
    label: "İlan & teklif",
    sections: [
      {
        id: "listings",
        title: "İlan ayarları",
        description: "İlan onay, red, iptal ve yenileme.",
        href: adminUrl("/listings"),
      },
      {
        id: "ilan-eposta",
        title: "Yeni ilan e-posta & API",
        description:
          "Onay sonrası il+meslek eşleşen üyelere e-posta; gizli anahtarlı webhook URL’leri ve gönderen adresi.",
        href: adminUrl("/ilan-eposta"),
        superOnly: true,
      },
      {
        id: "bid-settings",
        title: "Teklif ayarları",
        description: "Teklif verirken kredi / ücret kuralları.",
        href: adminUrl("/bid-settings"),
      },
      {
        id: "bids",
        title: "Teklif verilen işler",
        description: "Teklif alan ilanlar; her ilan altında tüm teklif verenler ve tutarlar.",
        href: adminUrl("/bids"),
      },
    ],
  },
];

export function flattenAdminSections(): AdminNavSection[] {
  return ADMIN_SECTION_GROUPS.flatMap((g) => g.sections);
}

/** Süper dışı panellerde ödeme sağlayıcı vb. bölümleri düşürür. */
export function filterNavGroupsByMode(
  groups: AdminNavGroup[],
  mode: AdminPanelMode,
): AdminNavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      sections: g.sections.filter((s) => !s.superOnly || mode === "super"),
    }))
    .filter((g) => g.sections.length > 0);
}

/** Süper yönetici: yönetici ekibi (rol ile koşullu) */
export const ADMIN_TEAM_SECTION: AdminNavSection = {
  id: "team",
  title: "Yönetici ekibi",
  description: "Yardımcı yönetici ekleme, çıkarma, şifre ve il yetkileri (en fazla 100 kişi).",
  href: adminUrl("/admins"),
};
