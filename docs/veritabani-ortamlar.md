# Veritabanı ortamları (PostgreSQL)

## Mevcut durum

- Prisma şeması **`provider = "postgresql"`** (`prisma/schema.prisma`).
- Bağlantı dizesi **`DATABASE_URL`** ortam değişkeninde tanımlıdır. **`PrismaClient`** yalnızca `DATABASE_URL` kullanır. **Migrate** (`prisma.config.ts`): tanımlıysa **`DIRECT_DATABASE_URL`**, aksi halde `DATABASE_URL` (Neon havuzlu/direct ayrımı için bkz. **`docs/hosting.md`**).
- Çalışma zamanı: **`@prisma/adapter-pg`** + **`pg`** havuzu (`src/lib/prisma.ts`).

## Yerel geliştirme

1. `docker compose up -d` (proje kökündeki `docker-compose.yml`).
2. `.env` içinde örnek bağlantı (`.env.example` ile uyumlu):

   `DATABASE_URL="postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev"`

3. Şema: `npx prisma migrate deploy` veya `npm run db:migrate`.

## Üretim

- **Neon, Supabase, RDS, DigitalOcean Managed Postgres** vb.: pano üzerinden `DATABASE_URL` alın; genelde `?sslmode=require` eklenir.
- **Render + Neon:** `docs/render.md`.
- Ortam değişkenleri özeti: **`.env.production.example`**.

## Eski SQLite verisinden taşıma

Bu depo artık SQLite migration içermez. Eski `dev.db` verisini taşımak için: şemayı Postgres’e kurduktan sonra özel bir dışa aktarma/içe aktarma veya araç (ör. `pgloader`, manuel CSV) kullanılmalıdır.
