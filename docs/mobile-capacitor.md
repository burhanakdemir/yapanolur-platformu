# Capacitor / TWA sonraki adımlar

Next.js bu projede SSR kullanır; mağaza kabuğu genelde **aynı kanonik siteyi** WebView’da açar.

**Pratik adımlar ve `.aab`:** kökte `capacitor.config.ts` + `mobile/README.md`.

## Ortam

- Üretimde **`APP_URL`** ve **`NEXTAUTH_URL`** tek ve HTTPS olmalı; WebView çerez oturumu bu origin’e bağlıdır.
- Yerel deneme: resmi Capacitor “live reload” dokümantasyonuna bakın; geliştirme cihazından geliştirici makinenize ağ erişimi gerekir.

## Capacitor şablonu (referans)

Projeye eklemeden önce: `npm i @capacitor/core @capacitor/cli` ve `npx cap init`. Aşağıdaki yapı örnektir; `webDir` ve `server` alanları kullandığınız Capacitor sürümüne göre güncellenmelidir.

```typescript
// capacitor.config.ts (kök — örnek)
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "tr.yapanolur.ilan",
  appName: "YapanOlur İlan",
  webDir: "mobile/www",
  server: {
    androidScheme: "https",
    url: process.env.CAPACITOR_SERVER_URL ?? "https://localhost:3000",
    cleartext: process.env.CAPACITOR_ALLOW_CLEARTEXT === "1",
  },
};

export default config;
```

`mobile/www` içinde Capacitor’un beklediği minimal statik içerik için resmi kılavuza uyun; tamamen uzak URL kullanıyorsanız sürüm notlarına bakın.

## PWA (tarayıcıdan kurulum)

Web için PNG ikonlar ve tarayıcı sekmesi `favicon.ico` (`npm run icons:pwa`) ile üretilir; logo dosya adı `src/config/brand.json` → `public/<logoFilename>`. Çıktılar: `public/icons/`, `src/app/icon.png`, `src/app/favicon.ico`. Manifest `src/app/manifest.ts` içindedir.

## Riskler

- Ödeme sayfaları ve `window.open` / özel şema bazen WebView’da farklı davranır.
- iOS App Store incelemesi: WebView ağırlıklı uygulamalar ek gereksinimlere takılabilir.
