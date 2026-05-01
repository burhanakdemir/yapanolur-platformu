# Render Production Rehberi

Bu rehber, projeyi Render uzerinde production'a alirken minimum riskli akis icin hazirlandi.

## 1) Zorunlu ortam degiskenleri

- `NODE_ENV=production`
- `APP_URL=https://<render-domain-veya-custom-domain>`
- `DATABASE_URL=postgresql://...`
- `AUTH_SECRET=<guclu-rastgele>`
- `OTP_PEPPER=<guclu-rastgele>`
- `SIGNUP_OTP_TTL_MINUTES` (istege bagli, varsayilan `15`) — kayit e-posta/SMS OTP gecerlilik suresi (dakika). Posta gecikmesi olan saglayicilarda `10` veya `15` kullanin; eski sabit 1 dk kaldirildi.

### SMTP ve kayit e-posta OTP (Render)

Uygulama kayit e-posta kodunu **SMTP (nodemailer)** ile gonderir; ayar yoksa `/api/register/request-email-otp` 502/400 doner.

- Panel: `/admin` SMTP alanlari **veya** Render ortaminda `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, istege bagli `SMTP_FROM`.
- Yaygin hatalar: `ETIMEDOUT` / `ECONNREFUSED` (host-port-guvenlik duvari), `535` (kimlik), `554`/`553` (From / SPF-DMARC).
- SMS OTP ayri kanal: `/admin/signup-sms-provider` veya `SIGNUP_OTP_ALLOW_LOG_FALLBACK` (yalnizca acil/test).
- Demo/staging: süper yönetici `/admin/signup-verification` ile kayıt e-posta ve/veya telefon OTP adımlarını kapatabilir (`AdminSettings`, varsayılan ikisi de açık). Üretimde açık bırakın.

## 2) Kalici upload/storage (Render)

Render diskine yazilan dosyalar kalici kabul edilmemelidir. Production icin `s3` provider kullanin.

- `STORAGE_PROVIDER=s3`
- `S3_REGION=<region>`
- `S3_BUCKET=<bucket>`
- `S3_ACCESS_KEY_ID=<access-key>`
- `S3_SECRET_ACCESS_KEY=<secret-key>`

Opsiyonel:

- `S3_ENDPOINT=<s3-compatible endpoint>`
- `S3_PUBLIC_BASE_URL=<cdn veya public base url>`
- `S3_FORCE_PATH_STYLE=1` (R2/MinIO/Spaces gerektirirse)
- `S3_KEY_PREFIX=uploads`
- `ALLOWED_UPLOAD_HOSTS=cdn.example.com,files.example.com`

### Kayit formu dosya yuklemesi (`/members`)

Kayit sirasinda oturum olmadigi icin `POST /api/uploads` kullanilmaz; uygulama `POST /api/register/uploads` ile yukler.

- Admin ayarlarindaki **e-posta / telefon OTP** ile ayni kanit cerezleri zorunludur (`signup_email_proof`, `signup_phone_proof`).
- Her iki dogrulama kapaliysa (yalnizca demo): endpoint yine calisir; kotayi `signupUpload` rate limit sinirlar.
- Bu e-posta adresi DB'de **zaten kayitliyse** `409` + `email_taken` (oturum acip panelden yukleyin).
- Depolama env eksikse `503` + `code: storage_config`.

### Next.js Image (`next/image`)

`next.config.ts` icinde `S3_PUBLIC_BASE_URL` ve `S3_ENDPOINT` hostlari otomatik eklenir. Saf AWS sanal barindirma (`https://bucket.s3.<region>.amazonaws.com/...`) icin ya `S3_PUBLIC_BASE_URL` tam taban URL olarak verilmeli ya da `NEXT_IMAGE_REMOTE_HOSTS` ile bucket hostname eklenmeli.

## 2.1) Admin il bazli yetki (opsiyonel feature flag)

- `ADMIN_PROVINCE_SCOPING_ENABLED=1` => il bazli admin kapsam aktif
- `ADMIN_PROVINCE_UNASSIGNED_MODE=all|none` (varsayilan: `all`)
- `ADMIN_PROVINCE_INCLUDE_NULL_CONVERSATIONS=0|1`

Not: flag kapaliysa mevcut davranis korunur (tum adminler tum il kayitlarini gorur).

## 3) Deploy oncesi

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. Kategori import gerekiyorsa: `npm run import:categories-sqlite`

## 4) Render deploy

1. Son commit'i GitHub'a push edin.
2. Render `Manual Deploy -> Deploy latest commit` (veya auto-deploy) calistirin.
3. Deploy log'larinda `prisma migrate deploy` basarili oldugunu dogrulayin.

## 5) Deploy sonrasi dogrulama

- `GET /api/health`
- `GET /api/health?deep=1`
- Admin panelde bir alt kategori resmi yukleyin.
- Yuklenen resim URL'sinin `/uploads/...` degil `https://...` oldugunu dogrulayin.
- Ilan olusturma akisinda gorsel URL'leri kabul ediliyor mu kontrol edin.
- **Uye kayit:** Oturum acik degilken `/members` ile OTP tamamla ve kayit gonder; belgeler kayit sonrasi giris ile ayni sayfadan yuklenir.
- **Uye paneli:** Giris yap, belge ve profil fotografi yukle; `403`/`503` yerine basari ve kalici `https://...` URL.
- Storage kasitli bozuksa: `POST /api/uploads` veya `POST /api/register/uploads` yanitinda `503` ve `code: storage_config` beklenir.

## 6) Operasyon notlari

- Production'da local upload varsayilan olarak kapali.
- Mecburi gecici acis:
  - `STORAGE_PROVIDER=local`
  - `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=1`
- Bu mod sadece kisa sureli acil durum icindir; kalici degildir.

## 7) Kategori gorsel runbook (tekrar bozulmayi onleme)

- Production'da `npm run seed:category-images` komutunu kullanmayin; bu komut kategori adina gore otomatik/farkli gorsel atar.
- Kategori gorselleri icin kaynak dosya `yedek/category-export-from-sqlite.json` olmalidir.
- Toplu duzeltmede veriyi kaynaga zorla hizalamak icin:
  - `npm run import:categories-sqlite -- --force-image-update`
- Her basarili toplu guncellemeden sonra yedek alin:
  - `npm run backup:categories`
- `backup` dosyalarini repoya zorunlu olarak koymak yerine guvenli harici depoda da saklayin.

## 8) Kisa rollback

1. Render'da onceki stabil deploy'u yeniden yayinlayin.
2. Environment'ta `STORAGE_PROVIDER` degerini onceki calisan degerine geri alin.
3. Son degisiklikte gelen kategori importunu gerekirse tekrar idempotent script ile uygulayin:
   - `npm run import:categories-sqlite`
