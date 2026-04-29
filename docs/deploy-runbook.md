# Production Deploy Runbook

Bu dokuman, projeyi server'a sorunsuz almak icin tek akis sunar.

## 1) Ortam degiskenleri

`/.env.production.example` dosyasindaki anahtarlari doldurun:

- `APP_URL` (https kanonik domain)
- `DATABASE_URL` (gerekirse `DIRECT_DATABASE_URL`)
- `AUTH_SECRET`, `OTP_PEPPER`
- Odeme anahtarlari (`IYZICO_*`, `PAYTR_*`)
- Gerekirse `UPSTASH_REDIS_REST_*`, `BLOB_READ_WRITE_TOKEN`, SMTP/SMS

## 2) Lokal kalite kapisi (tek komut)

```bash
npm run release:gate
```

Bu komut sirasiyla su kontrolleri kosar:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:auth-guards`
4. `npm run test:ci` (unit + e2e)
5. `npm run build` (`prisma migrate deploy` dahil)

## 3) Server deploy (VPS / PM2 or systemd)

```bash
npm ci
npm run build
npm run start
```

Not:
- Build adiminda migration calistigi icin DB erisimi hazir olmali.
- Reverse proxy (Nginx/Caddy) arkasinda `APP_URL` ile ayni domain kullanin.

## 4) Deploy sonrasi smoke test

- `GET /api/health` -> `200`
- `GET /api/health?deep=1` -> `200`
- Giris / cikis
- Ilan olusturma
- Odeme callback endpointleri

## 5) CI'da beklenen

`.github/workflows/ci.yml` icinde:
- `Auth guard tests` adimi (`npm run test:auth-guards`)
- Unit + E2E test adimlari
- Production build adimi

Bu adimlar yesilse ve smoke test gecerliyse yayin alinabilir.
