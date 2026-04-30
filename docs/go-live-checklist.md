# Yayına alma (go-live) kontrol listesi

Özet barındırma adımları için **`docs/hosting.md`**. Bu sayfa ek üretim maddelerini listeler.

## Ortam

- [ ] `APP_URL` kanonik **https://** adres (ödeme geri dönüşleri, Open Graph, `robots.txt` / `sitemap.xml`).
- [ ] `DATABASE_URL` yönetilen Postgres; yerel `127.0.0.1` yok. Neon vb. için gerekirse **`DIRECT_DATABASE_URL`** (migrate).
- [ ] `AUTH_SECRET`, `OTP_PEPPER` güçlü ve repoda yok.
- [ ] Çok instance / serverless: **`UPSTASH_REDIS_REST_*`** (oran sınırlama tutarlılığı).
- [ ] Kalıcı dosya: **`STORAGE_PROVIDER=s3` + `S3_*`** (Render için önerilen).
- [ ] Canlı ödeme: **Iyzico / PayTR** anahtarları ve bildirim URL’leri `APP_URL` ile uyumlu.
- [ ] **Sentry** (önerilir): `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] SMTP / SMS sağlayıcıları üretim değerleri.

## Güvenlik ve başlıklar

- [ ] **`ENABLE_HSTS=1`** yalnızca tüm trafiğin HTTPS olduğu kalıcı üretimde; ön yüzü HTTP veya localhost ile test ederken açmayın (`next.config.ts`).
- [ ] Ters vekil / CDN’de de HSTS kullanıyorsanız çift başlık vermeyin; bir katmanda yeter.
- [ ] İlk **SUPER_ADMIN** ve operasyon süreci tanımlı.

## SEO ve izleme

- [ ] `GET /sitemap.xml` ve `GET /robots.txt` canlı domainde doğrulandı.
- [ ] **KVKK / Çerez** metinleri hukuk ile gözden geçirildi (`/kvkk`, `/cerez-politikasi` şablon niteliğindedir).

## Sağlık ve yedek

- [ ] `GET /api/health` — yük dengeleyici için hafif kontrol.
- [ ] `GET /api/health?deep=1` — PostgreSQL `SELECT 1` (izleme; başarısızsa 503).
- [ ] Postgres yedekleme ve geri yükleme testi: **`docs/yedekleme.md`**.

## CI

- [ ] Monorepo ise kök workflow’un (`ilan-platformu-ci.yml`) çalıştığından emin olun; yalnızca `ilan/.github/workflows/ci.yml` yeterli olmayabilir.
