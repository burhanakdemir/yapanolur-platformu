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
    /** PWA — sidebar “Uygulamayı indir” (yalnızca dar ekran) */
    pwaInstall: {
      cta: string;
      wrongDevice: string;
      pickIos: string;
      pickAndroid: string;
      install: string;
      installing: string;
      androidFallback: string;
      modalTitle: string;
      iosTitle: string;
      iosStep1: string;
      iosStep2: string;
      iosStep3: string;
      androidTitle: string;
      androidBody: string;
      close: string;
      devHint: string;
      /** Sekme listesi (iOS/Android) — ekran okuyucu */
      devicePickerAriaLabel: string;
    };
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
    /** Kayitta belge yuklenmez; kullaniciya panelden yukleme hatirlatmasi */
    signupDocumentsLaterNotice: string;
    /** Kayit POST sirasinda */
    registerSending: string;
    /** Oturumlu panel: yildiz aciklamasi */
    panelStarBannerTitle: string;
    panelStarBannerLines: string[];
    /** Ana üye paneli / uyarı kutusu — belge linkine yönlendirme */
    panelStarBannerDocsCta: string;
    panelDocumentsHeading: string;
    docSlotDiploma: string;
    docSlotEngineering: string;
    docSlotTax: string;
    docNotUploadedYet: string;
    docChipUploaded: string;
    docChipMissing: string;
    /** Telefon OTP sonrasi bilgi */
    afterPhoneVerified: string;
    registrationSuccess: string;
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
      pwaInstall: {
        cta: "Uygulamayı İndir",
        wrongDevice: "Farklı cihaz mı?",
        pickIos: "iPhone / iPad",
        pickAndroid: "Android",
        install: "Kur",
        installing: "Kuruluyor…",
        androidFallback:
          "Chrome’da menü (⋮) → «Uygulamayı yükle» veya «Ana ekrana ekle» seçin.",
        modalTitle: "Uygulamayı indir",
        iosTitle: "iPhone / iPad — Ana Ekrana Ekle",
        iosStep1: "Safari veya Chrome’da bu sayfayı açın.",
        iosStep2:
          "Paylaş düğmesine dokunun (Safari’de genelde adres çubuğu yanında veya altta kare + ok simgesi).",
        iosStep3: "«Ana Ekrana Ekle» → «Ekle» ile onaylayın.",
        androidTitle: "Android",
        androidBody:
          "Chrome’da menü (⋮) üzerinden «Uygulamayı yükle» veya «Ana ekrana ekle» seçeneğini kullanın. Bazı cihazlarda adres çubuğundaki kurulum simgesi de görünür.",
        close: "Kapat",
        devHint: "Yerelde tam kurulum canlı (HTTPS) sitede geçerlidir.",
        devicePickerAriaLabel: "Kurulum talimatı için işletim sistemi seçin",
      },
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
      step3: "Kaydı tamamlama",
      signupDocumentsLaterNotice:
        "Doğrulama belgelerini kayıt sırasında yüklemenize gerek yok. Kaydı tamamlayıp giriş yaptıktan sonra bu sayfadan diploma, mühendislik hizmet belgesi ve vergi levhasını PDF veya resim olarak yükleyebilirsiniz. Dosyalar yalnızca doğrulama ve yasal gereklilikler içindir; üçüncü kişilerle paylaşılmaz.",
      registerSending: "Gönderiliyor…",
      panelStarBannerTitle: "Profil yıldızı nasıl hesaplanır?",
      panelStarBannerLines: [
        "Profilinizde görünen yıldız puanı 0 ile 5 arasındadır.",
        "Belgeler: Diploma, mühendislik hizmet belgesi ve vergi levhasının her biri en fazla 1 yıldız ekler — üçünü yüklediğinizde belgelerden en fazla 3 yıldız.",
        "Beğeniler: Her 10 beğeni +1 yıldız (arayüzde yaklaşık her 2 beğeni +0,2 olarak gösterilir); bu katkı en fazla +2 olabilir.",
        "Beğenmemeler: Aynı oranda eksi puan verir (en fazla −2). Belgelerden gelen puan ile birlikte hesaplanır.",
      ],
      panelStarBannerDocsCta:
        "Belgelerinizi eklemek veya güncellemek için aşağıdaki «Profil ve belgeler» kartından Üye belgeleri sayfasına gidin.",
      panelDocumentsHeading: "Doğrulama belgeleri",
      docSlotDiploma: "Diploma",
      docSlotEngineering: "Mühendislik hizmet belgesi",
      docSlotTax: "Vergi levhası",
      docNotUploadedYet: "Henüz yüklenmedi.",
      docChipUploaded: "Yüklü",
      docChipMissing: "Eksik",
      afterPhoneVerified: "Telefon doğrulandı. Kalan bilgileri doldurup kaydı tamamlayabilirsiniz.",
      registrationSuccess: "Üye kaydınız alındı.",
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
      pwaInstall: {
        cta: "Install app",
        wrongDevice: "Different device?",
        pickIos: "iPhone / iPad",
        pickAndroid: "Android",
        install: "Install",
        installing: "Installing…",
        androidFallback:
          "In Chrome, open the menu (⋮) → «Install app» or «Add to Home screen».",
        modalTitle: "Install app",
        iosTitle: "iPhone / iPad — Add to Home Screen",
        iosStep1: "Open this site in Safari or Chrome.",
        iosStep2:
          "Tap the Share button (often a square with an arrow near the address bar or toolbar).",
        iosStep3: "Tap «Add to Home Screen», then «Add».",
        androidTitle: "Android",
        androidBody:
          "In Chrome, use the menu (⋮) → «Install app» or «Add to Home screen». Some devices also show an install icon in the address bar.",
        close: "Close",
        devHint: "Full install behaviour applies on the live HTTPS site.",
        devicePickerAriaLabel: "Choose operating system for install instructions",
      },
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
      step3: "Complete registration",
      signupDocumentsLaterNotice:
        "You do not upload verification documents during sign-up. After you register and sign in, upload your diploma, engineering service certificate and tax certificate here as PDF or image. Files are for verification and legal use only and are not shared with third parties.",
      registerSending: "Sending…",
      panelStarBannerTitle: "How your profile star score works",
      panelStarBannerLines: [
        "Your star rating is shown on a scale from 0 to 5.",
        "Documents: Each of the three slots (diploma, engineering service certificate, tax certificate) adds up to 1 star — up to 3 stars from documents when all are uploaded.",
        "Likes: Every 10 likes add about +1 star (the UI shows roughly +0.2 per 2 likes); this bonus is capped at +2.",
        "Dislikes: Apply the same rule in the negative direction (capped at −2). Document stars and votes are combined.",
      ],
      panelStarBannerDocsCta:
        "To upload or update certificates, open Member documents via the «Profile & documents» card below.",
      panelDocumentsHeading: "Verification documents",
      docSlotDiploma: "Diploma",
      docSlotEngineering: "Engineering service certificate",
      docSlotTax: "Tax certificate",
      docNotUploadedYet: "Not uploaded yet.",
      docChipUploaded: "Uploaded",
      docChipMissing: "Missing",
      afterPhoneVerified: "Phone verified. Fill in the remaining fields to complete registration.",
      registrationSuccess: "Your registration was received.",
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
