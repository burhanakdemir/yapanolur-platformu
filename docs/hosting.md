# Barındırma (hosting) — veritabanı ve ortam

Yerelde `docker compose` ile çalışan PostgreSQL, barındırma ortamında **erişilemez**. Üretimde mutlaka **internet üzerinden erişilen** bir PostgreSQL kullanın (Neon, Supabase, RDS, DigitalOcean Managed DB, kendi VPS’inizdeki Postgres vb.).

## 1) Bağlantı neden düşer?

| Sorun | Ne yapılmalı |
|--------|----------------|
| `DATABASE_URL` hâlâ `127.0.0.1` / `localhost` | Barındırıcı panelinde, sağlayıcının verdiği **tam** bağlantı dizesini kullanın. |
| SSL | Yönetilen servislerde genelde `?sslmode=require` gerekir. Yerel Docker’da bazen `require` bağlantıyı keser — yerelde kaldırın; üretimde ekleyin. |
| `DATABASE_SSL_DISABLE=1` üretimde açık | Yalnızca yerel güvenilir Postgres için; üretimde kullanmayın. |
| Neon + havuzlu URL ile migration hatası | Aşağıdaki **DIRECT_DATABASE_URL** bölümüne bakın. |

## 2) Zorunlu ortam değişkenleri (özet)

Şablon: **`.env.production.example`**. Barındırıcı panelinde (ör. Render → Environment) aynı anahtarları tanımlayın.

- **`DATABASE_URL`** — Uygulama + (çoğu senaryoda) migration için PostgreSQL URL’i.
- **`APP_URL`** — Kanonik site adresi, `https://alanadiniz.com` (ödeme geri dönüşleri ve metadata için).
- **`AUTH_SECRET`**, **`OTP_PEPPER`** — Güçlü rastgele değerler (`.env.production.example` ile hizalayın).

## 3) Neon: havuzlu ve doğrudan URL

Neon genelde iki bağlantı sunar:

- **Havuzlu (pooler)** — Sunucusuz / çoklu instance için uygulama trafiğine uygun.
- **Doğrudan (direct)** — Bazen `prisma migrate deploy` için önerilir.

Bu projede:

- **Çalışma zamanı** (`PrismaClient`): yalnızca **`DATABASE_URL`** kullanılır (tercihen havuzlu).
- **Migration** (`npm run build` içindeki `prisma migrate deploy`): **`DIRECT_DATABASE_URL` tanımlıysa** bu adres, değilse `DATABASE_URL` kullanılır.

Örnek:

```bash
DATABASE_URL="postgresql://...@ep-xxxx-pooler....neon.tech/neondb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://...@ep-xxxx....neon.tech/neondb?sslmode=require"
```

## 4) Render

1. Neon (veya başka Postgres) oluşturun; bağlantı dizelerini alın.
2. Render servisinde **Environment** alanına gerekli değişkenleri girin.
3. `APP_URL` üretim domain’iniz olsun.
4. Deploy sonrası: build log’unda `prisma migrate deploy` başarılı olmalı.
5. Upload için `STORAGE_PROVIDER=s3` ve `S3_*` değişkenleri tanımlı olmalı.

Ayrıntı: **`docs/render.md`**.

## 5) VPS / Docker ile kendi sunucunuz

- Postgres’i aynı makinede veya erişilebilir bir host’ta çalıştırın; güvenlik duvarında **5432** (veya kullandığınız port) uygulama sunucusuna açık olmalı (yalnızca gerekli IP’lere kısıtlayın).
- `DATABASE_URL` içinde **sunucunun hostname veya IP’si** kullanılmalı, `localhost` değil.

Genişletilmiş madde listesi: **`docs/go-live-checklist.md`** (HSTS, `/api/health`, sitemap).

## 6) İlk deploy kontrol listesi

- [ ] `DATABASE_URL` üretim Postgres’e işaret ediyor (`sslmode` sağlayıcıya uygun).
- [ ] Gerekirse `DIRECT_DATABASE_URL` (Neon direct vb.) tanımlı.
- [ ] `APP_URL` HTTPS ve gerçek domain.
- [ ] `AUTH_SECRET` / `OTP_PEPPER` üretim değerleri.
- [ ] Yerel `.env` içindeki `DATABASE_SSL_DISABLE` üretim ortamına taşınmıyor.

Sorun giderme: **`docs/baglanti-sorun-giderme.md`**, yerel test: `npm run db:doctor`.
