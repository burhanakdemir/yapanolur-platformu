/**
 * PostgreSQL — Prisma 7: `PrismaPg` + `pg` havuzu. `DATABASE_URL` `prisma.config.ts` ile aynı kaynaktan okunur.
 * Yerel: `docker compose up -d` — bkz. `.env.example`, `docs/local-db.md`.
 *
 * Not: `PrismaClient` Proxy ile sarmalanmaz; Turbopack/RSC altında `prisma.ad.count()` gibi çağrılarda
 * "Invalid invocation" hatalarına yol açabiliyordu.
 */
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertReasonableDatabaseUrl } from "@/lib/databaseUrlSanity";
import { resolveDatabaseUrl } from "@/lib/resolveDatabaseUrl";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL ortam degiskeni tanimlanmali. Ornek: DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB"',
    );
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL artık SQLite (file:...) değil; PostgreSQL kullanın. Örnek: postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev — docker compose up -d. Bkz. .env.example",
    );
  }
  assertReasonableDatabaseUrl(url);
  return resolveDatabaseUrl(url);
}

function getPool(): Pool {
  const cached = globalForPrisma.pgPool;
  if (cached) return cached;
  const connectionString = getConnectionString();
  /** Yerel Docker Postgres genelde SSL sunmaz; URL'de ?sslmode=require varsa bağlantı düşer. `DATABASE_SSL_DISABLE=1` ile zorla kapatın. */
  const sslExplicit =
    process.env.DATABASE_SSL_DISABLE === "1" || process.env.DATABASE_SSL_DISABLE === "true"
      ? false
      : undefined;
  const connectMs = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS);
  const connectionTimeoutMillis =
    Number.isFinite(connectMs) && connectMs > 0 ? connectMs : 15_000;
  const pool = new Pool(
    sslExplicit === false
      ? { connectionString, ssl: false, connectionTimeoutMillis }
      : { connectionString, connectionTimeoutMillis },
  );
  globalForPrisma.pgPool = pool;
  return pool;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter });
}

/**
 * Şema güncellemesinden sonra (ör. yeni model) dev/HMR global’daki eski Prisma örneği
 * bazen yeni delegate’leri taşımaz → `prisma.homeHeroSlide` / `prisma.sponsorHeroPurchaseRequest` undefined olur.
 * Beklenen delegate’ler yoksa önbelleği atlayıp istemciyi yeniden oluştur.
 *
 * Not: `export const prisma` yalnızca modül yüklenirken bir kez bağlanır; HMR sonrası güncel örneği
 * garanti etmek için kritik API route’larda `getPrismaClient()` kullanın.
 */
/** Eski global örnekte eksik delegate var mı (HMR / şema güncellemesi sonrası). */
function prismaSponsorDelegatesPresent(client: unknown): boolean {
  try {
    const p = client as {
      homeHeroSlide?: { findMany?: unknown };
      sponsorHeroPurchaseRequest?: { findFirst?: unknown };
    };
    return (
      typeof p.homeHeroSlide?.findMany === "function" &&
      typeof p.sponsorHeroPurchaseRequest?.findFirst === "function"
    );
  } catch {
    return false;
  }
}

function getOrRefreshPrismaSingleton(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && prismaSponsorDelegatesPresent(cached)) {
    return cached;
  }

  const fresh = createPrismaClient();
  if (!prismaSponsorDelegatesPresent(fresh) && process.env.NODE_ENV === "development") {
    const q = fresh as unknown as Record<string, unknown>;
    console.warn(
      "[prisma] Delegate kontrolü beklenen şekilde geçmedi (bundler/istemci sızıntısı veya codegen). homeHeroSlide=%s sponsorHeroPurchaseRequest=%s — gerekirse: npx prisma generate, .next temizliği, sunucuyu yeniden başlatın.",
      typeof q.homeHeroSlide,
      typeof q.sponsorHeroPurchaseRequest,
    );
  }
  globalForPrisma.prisma = fresh;
  return fresh;
}

/** Şema/HMR sonrası güncel singleton; sponsor vb. kritik sorgularda `prisma` import yerine bunu kullanın. */
export function getPrismaClient(): PrismaClient {
  return getOrRefreshPrismaSingleton();
}

export const prisma: PrismaClient = getPrismaClient();
