# Mobil uygulama yol haritası — özet ve test

Bu dosya PWA ilk fazının ne yaptığını ve sonraki adımları özetler. Ayrıntılı “uygulama promptu” yeni bir Cursor görevinde aşağıdaki blok olarak kullanılabilir.

## Uygulama promptu (kopyala-yapıştır)

```text
Repo: yapanolur içinde `ilan` — Next.js 16 + App Router + Prisma (Postgres). AGENTS.md: Next sürümü eğitim verisinden farklı; gerekirse `node_modules/next/dist/docs` oku.

Hedef: Mobil yol haritasının 1. fazını uygula, mevcut özellikleri kırma.

1) PWA (öncelik)
- `src/app/manifest.ts`: MetadataRoute.Manifest — name, short_name, description, start_url `/`, scope `/`, display `standalone`, theme_color / background_color viewport ile uyumlu (`#fff7ed`), orientation `portrait-primary`, ikonlar: `src/app/icon.svg` → `/icon.svg` (any + maskable purpose).
- `src/app/apple-icon.tsx`: `next/og` ImageResponse, edge, 180×180 PNG — görsel dil `icon.svg` ile uyumlu.
- `src/app/layout.tsx` metadata: `appleWebApp` + gerekirse `applicationName`.
- Üretimde: `public/sw.js` passthrough; `PwaRegister` yalnızca production’da SW kaydı. Root layout’ta `<PwaRegister />`.

2) Dokümantasyon: bu dosya + README kısa PWA notu.

3) Sonraki faz: Capacitor veya TWA — kanonik `APP_URL`, HTTPS, çerez tabanlı oturum için tek domain; ödeme/WebView kısıtları.

Doğrulama: typecheck, lint, test; mümkünse `build:skip-migrate`.
```

## Yapılanlar (PWA — faz 1)

- `src/app/manifest.ts` — Web App Manifest (`/manifest.webmanifest`).
- `src/app/apple-icon.tsx` — Apple Touch Icon (180×180 PNG).
- `src/app/layout.tsx` — `appleWebApp`, `applicationName`, `<PwaRegister />`.
- `public/sw.js` — minimal fetch passthrough service worker.
- `src/components/PwaRegister.tsx` — SW kaydı sadece `NODE_ENV === 'production'`.

## Cihazda test

- **HTTPS:** Service worker ve güvenilir PWA davranışı için üretim veya `localhost` kullanın. LAN IP üzerinden HTTP’de SW kaydı tarayıcıya göre kısıtlanabilir.
- **`APP_URL` / `NEXTAUTH_URL`:** Oturum ve mutlak URL’ler için tarayıcıda açılan adresle uyumlu olmalı (`src/lib/appUrl.ts`).
- **Chrome (Android / masaüstü):** Adres çubuğunda “Yükle” / installability için manifest + kayıtlı SW (üretim build + `next start` veya barındırıcı) gerekir.
- **Safari (iOS):** Paylaş → Ana Ekrana Ekle; manifest yerine çoğunlukla meta / apple-touch-icon kullanılır.

## Sonraki faz — mağaza kabuğu (özet)

- **`docs/mobile-capacitor.md`** — örnek `capacitor.config`, ortam ve risk notları.
- **TWA / Bubblewrap:** Aynı origin’de dijital varlık bağlantısı ve Play politikaları.
- **Dikkat:** Ödeme akışları ve üçüncü taraf çerezler WebView’da kısıtlanabilir; kritik akışları gerçek cihazda doğrulayın.
