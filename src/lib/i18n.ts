export type Lang = "tr" | "en";

type Dictionary = {
  siteTitle: string;
  siteDescription: string;
  home: {
    tagline: string;
    heroTitle: string;
    heroSubtitle: string;
    primaryButton: string;
    secondaryButton: string;
    /** Sağ sütun: ilan ver şeridi başlığı */
    postListingTitle: string;
    postListingSubtitle: string;
    postListingCta: string;
  };
  categoriesTitle: string;
  categories: Record<string, string>;
  nav: {
    home: string;
    newAd: string;
    memberDocs: string;
    admin: string;
  };
  common: {
    submit: string;
    price: string;
    location: string;
  };
  /** Uye kayit / belgeler sayfasi */
  memberPage: {
    loading: string;
    registrationProgressLabel: string;
    step1: string;
    step2: string;
    step3: string;
    privacyDocuments: string;
    /** Telefon OTP sonrasi bilgi */
    afterPhoneVerified: string;
    registrationSuccess: string;
    signupDocDiploma: string;
    signupDocEngineering: string;
    signupDocTax: string;
    professionLabel: string;
    professionHelp: string;
    newAdEmailOptInLabel: string;
    newAdEmailOptInHelp: string;
    /** Üye paneli: kayıt formundaki kutu ile aynı tercih */
    newAdEmailPanelIntro: string;
    comboboxPlaceholder: string;
    comboboxNoResults: string;
    comboboxClear: string;
    comboboxSearching: string;
    validationProfession: string;
    /** Kayıt formu: giriş linki */
    alreadyMemberLogin: string;
    loginLinkLabel: string;
    afterRegisterLoginHint: string;
  };
};

export const dictionary: Record<Lang, Dictionary> = {
  tr: {
    siteTitle: "İlan ve İhale Platformu",
    siteDescription:
      "Mühendislik, şehir planlama, inşaat ve renovasyon ilanları için teklif platformu.",
    home: {
      tagline: "Çok satıcılı ilan ve teklif platformu",
      heroTitle: "Kullanıcı veya ilan veren olarak katılın",
      heroSubtitle:
        "Kullanıcı olarak teklif verin, ilan yayınlayın ve ilanlarınızı gerçek zamanlı yönetin.",
      primaryButton: "Üye Girişi",
      secondaryButton: "Kayıt Olun",
      postListingTitle: "İlan verme alanı",
      postListingSubtitle:
        "Platformun dört ana başlığında proje ilanı oluşturun; teklifler ve ihale süreçleri tek yerde.",
      postListingCta: "İlan ver",
    },
    categoriesTitle: "Üst Kategoriler",
    categories: {
      ENGINEERING_PROJECTS: "Mühendislik Projeleri",
      URBAN_PLANNING_PROJECTS: "Şehir Planlama Projeleri",
      CONSTRUCTION_PROJECTS: "İnşaat Projeleri",
      CONSTRUCTION_AND_RENOVATION_PROJECTS: "İnşaat Tadilat Projeleri",
    },
    nav: {
      home: "Ana Sayfa",
      newAd: "İlan Ekle",
      memberDocs: "Üye belgeleri",
      admin: "Yönetim",
    },
    common: {
      submit: "Kaydet",
      price: "Ücret",
      location: "Konum",
    },
    memberPage: {
      loading: "Bilgiler yükleniyor…",
      registrationProgressLabel: "Üyelik kaydı adımları",
      step1: "İletişim ve doğrulama",
      step2: "Adres ve meslek",
      step3: "Belgeler (isteğe bağlı) ve gönderim",
      privacyDocuments:
        "Belgeler isteğe bağlıdır; yüklediğiniz her belge profil yıldızınıza katkı verir (en fazla 3). Görseller yalnızca doğrulama ve yasal gereklilikler içindir; üçüncü taraflarla paylaşılmaz.",
      afterPhoneVerified: "Telefon doğrulandı. Kalan bilgileri doldurup kaydı tamamlayabilirsiniz.",
      registrationSuccess: "Üye kaydınız alındı.",
      signupDocDiploma: "Diploma (resim, isteğe bağlı)",
      signupDocEngineering: "Mühendislik hizmet belgesi (resim, isteğe bağlı)",
      signupDocTax: "Vergi levhası (resim, isteğe bağlı)",
      professionLabel: "Meslek",
      professionHelp:
        "Baş harfler yazarak arayın veya listeden seçin. Listeyi yönetici panelinden (Meslek ayarları) düzenleyebilirsiniz.",
      newAdEmailOptInLabel: "Yeni ilanlardan e-posta ile haberdar olmak istiyorum",
      newAdEmailOptInHelp:
        "İşaretlerseniz, meslek dalınız ve kayıtlı ilinizle eşleşen yeni ilanlar için e-posta ile bilgilendirilebilirsiniz.",
      newAdEmailPanelIntro:
        "Kayıt sırasında seçtiğiniz tercihtir; meslek ve ilinize uygun yeni ilanlar için e-posta bildirimini açık veya kapalı tutun.",
      comboboxPlaceholder: "Meslek adının baş harflerini yazın veya listeden seçin",
      comboboxNoResults: "Eşleşen meslek yok. Yazdığınızı kontrol edin.",
      comboboxClear: "Temizle",
      comboboxSearching: "Aranıyor…",
      validationProfession: "Lütfen listeden bir meslek seçin (yazdıktan sonra satıra tıklayın veya Enter ile onaylayın).",
      alreadyMemberLogin: "Zaten üye misiniz?",
      loginLinkLabel: "Giriş yap",
      afterRegisterLoginHint: "Kayıt alındı. Devam etmek için giriş yapın.",
    },
  },
  en: {
    siteTitle: "Tender and Ad Platform",
    siteDescription:
      "Bidding platform for engineering, urban planning, construction and renovation ads.",
    home: {
      tagline: "Multivendor listing and bidding platform",
      heroTitle: "Join as user or seller",
      heroSubtitle: "Place bids as user, publish listings, and manage your listings in real-time.",
      primaryButton: "Sign in",
      secondaryButton: "Register",
      postListingTitle: "Post a listing",
      postListingSubtitle:
        "Create project listings under the platform’s four main segments—bids and tenders in one place.",
      postListingCta: "Post listing",
    },
    categoriesTitle: "Top Categories",
    categories: {
      ENGINEERING_PROJECTS: "Engineering Projects",
      URBAN_PLANNING_PROJECTS: "Urban Planning Projects",
      CONSTRUCTION_PROJECTS: "Construction Projects",
      CONSTRUCTION_AND_RENOVATION_PROJECTS: "Construction and Renovation Projects",
    },
    nav: {
      home: "Home",
      newAd: "Post Ad",
      memberDocs: "Member Documents",
      admin: "Admin",
    },
    common: {
      submit: "Save",
      price: "Fee",
      location: "Location",
    },
    memberPage: {
      loading: "Loading…",
      registrationProgressLabel: "Registration steps",
      step1: "Contact and verification",
      step2: "Address and profession",
      step3: "Documents (optional) and submit",
      privacyDocuments:
        "Documents are optional; each upload adds to your profile star score (up to three). Images are for verification and legal use only; not shared with third parties.",
      afterPhoneVerified: "Phone verified. Fill in the remaining fields to complete registration.",
      registrationSuccess: "Your registration was received.",
      signupDocDiploma: "Diploma (image, optional)",
      signupDocEngineering: "Engineering service certificate (image, optional)",
      signupDocTax: "Tax certificate (image, optional)",
      professionLabel: "Profession",
      professionHelp:
        "Type to search or pick from the list. Professions are managed in the admin panel (Profession settings).",
      newAdEmailOptInLabel: "I want email notifications about new relevant listings",
      newAdEmailOptInHelp:
        "If you opt in, you may get email when a new listing matches your profession and registered province.",
      newAdEmailPanelIntro:
        "Same choice as on registration. Turn email alerts on or off for new listings that match your profession and province.",
      comboboxPlaceholder: "Type to search or select from the list",
      comboboxNoResults: "No matching profession. Check your spelling.",
      comboboxClear: "Clear",
      comboboxSearching: "Searching…",
      validationProfession: "Please select a profession from the list (click a row or press Enter).",
      alreadyMemberLogin: "Already a member?",
      loginLinkLabel: "Sign in",
      afterRegisterLoginHint: "Registration received. Sign in to continue.",
    },
  },
};

export function getLang(value?: string): Lang {
  return value === "en" ? "en" : "tr";
}
