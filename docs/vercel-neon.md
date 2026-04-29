# Üretim: Vercel, PostgreSQL (Neon), ortam değişkenleri

## Yerel geliştirme

- **PostgreSQL:** `docker compose up -d` ve `.env` içinde `DATABASE_URL` (bkz. `.env.example`, `docs/local-db.md`).
- Oturum: NextAuth yok; `session_token` + `AUTH_SECRET` (`jose`).

## Neon + Vercel (özet)

1. [Neon](https://neon.tech) projesi oluşturun; **connection string** alın (genelde `?sslmode=require`).
2. Vercel **Environment Variables**:
   - `DATABASE_URL` — Uygulama çalışma zamanı (tercihen **havuzlu / pooler** URL).
   - `DIRECT_DATABASE_URL` — İsteğe bağlı; migration (`prisma migrate deploy`, build içinde) için Neon’un **doğrudan (non-pooler)** URL’i. Havuzlu URL ile migrate hata verirse ekleyin. Ayrıntı: **`docs/hosting.md`**.
   - `AUTH_SECRET`, `APP_URL`, `OTP_PEPPER`, ödeme ve yönetici değişkenleri: **`.env.production.example`** ile hizalayın.
3. Tek `DATABASE_URL` ile çoğu senaryoda yeterlidir; sorun olursa `DIRECT_DATABASE_URL` kullanın.
4. **Kalıcı upload:** Vercel Blob — `BLOB_READ_WRITE_TOKEN`.
5. **Oran sınırı (çoklu instance):** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

## Derleme

- `npm run build` — `prisma migrate deploy` içerir; Vercel build aşamasında `DATABASE_URL` erişilebilir olmalıdır.
- Migration’ı build dışında çalıştırmak için: `npm run build:skip-migrate` (özel senaryolar).
