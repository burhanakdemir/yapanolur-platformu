# Yerel veritabanı (PostgreSQL)

## Kurulum

1. [Docker](https://docs.docker.com/get-docker/) yüklü olsun.
2. Proje kökünde:

   ```bash
   docker compose up -d
   ```

3. `.env` dosyasında (`.env.example` ile aynı mantık):

   ```env
   DATABASE_URL="postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev"
   ```

4. Tabloları oluşturun:

   ```bash
   npx prisma migrate deploy
   ```

   veya `npm run db:migrate`.

## Sorun giderme

- **Bağlantı reddedildi:** Postgres konteynerinin çalıştığını doğrulayın (`docker compose ps`). Windows’ta Docker Desktop açık olmalı. `localhost` yerine **`127.0.0.1`** kullanın (IPv6 `::1` ile Docker IPv4 çakışması sık görülür); kod `resolveDatabaseUrl` ile `localhost`’u da düzeltir.
- **Eski SQLite:** `.env` içinde `DATABASE_URL=file:./dev.db` kalmışsa kaldırın; yalnızca `postgresql://...` kullanın.
- **`sslmode=require` ile yerel hata:** Docker’daki Postgres varsayılan olarak SSL sunmaz. Yerel geliştirmede bağlantı dizesinde `?sslmode=require` kullanmayın veya `.env` içine `DATABASE_SSL_DISABLE=1` ekleyin (yalnızca güvendiğiniz yerel sunucu için).
- **Şema eksik:** `npx prisma migrate deploy` çalıştırın.
- **Port 5432 meşgul:** Başka bir PostgreSQL kurulumu veya ikinci konteyner aynı portu kullanıyor olabilir. `docker-compose.yml` içinde `ports` değiştirin ve `DATABASE_URL`’deki portu eşleştirin.
