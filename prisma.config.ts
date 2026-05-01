import "dotenv/config";
import { defineConfig } from "prisma/config";
import { assertReasonableDatabaseUrl } from "./src/lib/databaseUrlSanity";
import { resolveDatabaseUrl } from "./src/lib/resolveDatabaseUrl";

const rawUrl = process.env["DATABASE_URL"]?.trim();
if (!rawUrl) {
  throw new Error(
    'DATABASE_URL ortam değişkeni tanımlı olmalı. Yerel: postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev — üretim: barındırılan Postgres (ör. ?sslmode=require). Bkz. .env.example, docs/hosting.md',
  );
}
if (rawUrl.startsWith("file:")) {
  throw new Error(
    "DATABASE_URL artık SQLite (file:...) değil; PostgreSQL kullanın. Örnek: postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev — docker compose up -d. Bkz. .env.example",
  );
}

assertReasonableDatabaseUrl(rawUrl);

const rawDirect = process.env["DIRECT_DATABASE_URL"]?.trim();
/**
 * Migrate (`prisma migrate deploy`, `npm run build` içinde) hangi URL’yi kullanır:
 * - Barındırıcıda (Neon vb.) havuzlu `DATABASE_URL` ile migration sorun çıkarırsa **doğrudan** bağlantı verin.
 * - Uygulama çalışma zamanı yalnızca `DATABASE_URL` kullanır (`src/lib/prisma.ts`).
 */
const migrateUrl = resolveDatabaseUrl(rawDirect || rawUrl);

/** PostgreSQL — yerel Docker veya barındırılan (Neon, RDS, …). */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrateUrl,
  },
});
