# İlan platformu (Next.js)

**Monorepo:** Bu klasör `yapanolur` deposunda `Web Tasarım/ilan` yolundaysa, GitHub Actions için kökteki `.github/workflows/ilan-platformu-ci.yml` kullanılır; buradaki `.github/workflows/ci.yml` yalnızca `ilan` tek başına repo kökü olduğunda çalışır.

1. `.env.example` dosyasını `.env` olarak kopyalayın.
2. **PostgreSQL:** `docker compose up -d` (Docker gerekli). Bağlantı dizesi `.env.example` ile uyumlu olmalı (`DATABASE_URL`).
3. `AUTH_SECRET` ve `OTP_PEPPER` zorunludur.

## Komutlar

```bash
npm install
docker compose up -d
npm run db:doctor   # bağlantı testi (opsiyonel)
npm run db:migrate
npm run dev
```

Docker kuramıyorsanız ücretsiz Postgres için: **`docs/baglanti-sorun-giderme.md`** (Neon).

**Hosting / üretim:** barındırıcıya taşırken `DATABASE_URL` yerel `127.0.0.1` olmamalı; ortam değişkenleri ve Neon `DIRECT_DATABASE_URL` için **`docs/hosting.md`**.

- **Lint / tip / test:** `npm run lint`, `npm run typecheck`, `npm run test`
- **PWA / logo:** `src/config/brand.json` (`logoFilename` → `public/…`), ardından `npm run icons:pwa` (`public/icons/`, `src/app/icon.png`, `favicon.ico`); `src/app/manifest.ts`. Üretimde `public/sw.js` (`PwaRegister`). Test ve mağaza: **`docs/mobile-app-roadmap-prompt.md`**
- **Knip:** `npm run knip` — kullanılmayan bağımlılık / eksik binary (üretim odaklı); tam rapor için `npm run knip:all` (çok sayıda “kullanılmayan export” uyarısı normal olabilir)
- **E2E:** `npm run build` sonrası `npm run test:e2e` (Playwright sunucuyu başlatır)
- **CI:** GitHub Actions — `.github/workflows/ci.yml` (push/PR)

## Dokümantasyon

- `docs/local-db.md` — yerel Docker Postgres
- `docs/hosting.md` — barındırma, `DATABASE_URL`, Neon doğrudan URL
- `docs/veritabani-ortamlar.md` — PostgreSQL mimarisi
- `docs/render.md` — Render + PostgreSQL + storage
- `docs/yedekleme.md` — yedekleme özeti
- `docs/go-live-checklist.md` — yayın öncesi ortam, HSTS, SEO, sağlık URL’leri
- `.env.production.example` — üretim ortam değişkenleri şablonu
- `docs/mobile-app-roadmap-prompt.md` — mobil PWA özeti, cihaz testi
- `docs/mobile-capacitor.md` — Capacitor şablonu ve WebView notları

## Kaynaklar

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
