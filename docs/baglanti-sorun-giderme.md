# Veritabanına bağlanılamıyor — hızlı seçenekler

`DATABASE_URL` artık SQLite (`file:...`) değil; **PostgreSQL** kullanın. Örnek: `postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev` — yerelde `docker compose up -d`. Tam şablon ve notlar: **`.env.example`**.

Önce terminalde (proje kökünde):

```bash
npm run db:doctor
```

Bu komut `.env` içindeki `DATABASE_URL` ile doğrudan bağlantı dener ve hatayı gösterir.

### `Can't reach database server at 127.0.0.1:5432` veya Postgres yanıt vermiyor

Bu adres, **yalnızca bu bilgisayarda çalışan** PostgreSQL’i ifade eder. Yanıt yoksa aşağıdakilerden biri eksiktir:

| Durum | Ne yapın |
|--------|-----------|
| Terminalde `docker` komutu yok / tanınmıyor | **Docker Desktop for Windows** kurun, kurulumdan sonra bilgisayarı yeniden başlatın, tepside Docker’ı açın (motor **çalışıyor** olana kadar bekleyin). Ardından proje kökünde `docker compose up -d` veya `npm run db:up`. |
| Docker kurulu ama konteyner kapalı | Proje kökünde: `docker compose up -d` — sonra `docker compose ps` ile `postgres` satırının **running** olduğunu doğrulayın. |
| Docker kullanmak istemiyorsunuz | **Neon** (veya başka bulut Postgres) kullanın; `.env` içinde `DATABASE_URL`’ü bulut bağlantı dizesi yapın — **bölüm 2**. Yerelde 5432 dinleyen sunucu gerekmez. |
| 5432 başka programda | `docker-compose.yml` içinde host portunu (ör. `5433:5432`) değiştirip `DATABASE_URL` içindeki portu aynı yapın. |

---

## 1) Docker ile (önerilen, yerel)

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu ve **çalışıyor** olmalı (tepsi simgesi; ilk açılışta birkaç dakika sürebilir).
2. Proje kökünde: `docker compose up -d` (veya `npm run db:up`)
3. ~10 saniye bekleyin, sonra: `npm run db:migrate`
4. `.env` içinde örnek:

   `DATABASE_URL="postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev"`

---

## 2) Docker yok — ücretsiz bulut Postgres (Neon)

1. [Neon](https://neon.tech) ile proje oluşturun, **connection string** kopyalayın (genelde `?sslmode=require` içerir).
2. `.env` içinde:

   `DATABASE_URL="postgresql://...@...neon.tech/neondb?sslmode=require"`

3. `npm run db:migrate`
4. `npm run dev`

Bilgisayarda PostgreSQL veya Docker kurmanız gerekmez.

---

## 3) Hâlâ olmuyor

- `DATABASE_URL` yalnızca **`postgresql://...`** olmalı; **`file:`** / SQLite kullanılmaz (bkz. giriş ve bölüm 1–2).
- Yerel Docker kullanıyorsanız URL’de **`?sslmode=require` olmaması** gerekir; Neon kullanıyorsanız genelde **olması** gerekir.
- Port **5432** başka bir program tarafından kullanılıyor olabilir; `docker-compose.yml` içinde `5432:5432` yerine `5433:5432` yapıp `DATABASE_URL` içindeki portu **5433** yapın.

Detay: [local-db.md](./local-db.md), [render.md](./render.md).
