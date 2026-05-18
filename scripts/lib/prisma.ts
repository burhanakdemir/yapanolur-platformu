/**
 * CLI seed/script komutlari icin Prisma (server-only yok).
 * Next.js uygulama kodu `src/lib/prisma.ts` kullanmaya devam eder.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { assertReasonableDatabaseUrl } from "../../src/lib/databaseUrlSanity";
import { resolveDatabaseUrl } from "../../src/lib/resolveDatabaseUrl";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL ortam degiskeni tanimlanmali. Ornek: DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB"',
    );
  }
  if (url.startsWith("file:")) {
    throw new Error("DATABASE_URL SQLite degil; PostgreSQL kullanin.");
  }
  assertReasonableDatabaseUrl(url);
  return resolveDatabaseUrl(url);
}

let pool: Pool | undefined;
let prismaInstance: PrismaClient | undefined;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  const sslExplicit =
    process.env.DATABASE_SSL_DISABLE === "1" || process.env.DATABASE_SSL_DISABLE === "true"
      ? false
      : undefined;
  const connectMs = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS);
  const connectionTimeoutMillis =
    Number.isFinite(connectMs) && connectMs > 0 ? connectMs : 15_000;
  pool = new Pool(
    sslExplicit === false
      ? { connectionString, ssl: false, connectionTimeoutMillis }
      : { connectionString, connectionTimeoutMillis },
  );
  return pool;
}

export function getScriptPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({ adapter: new PrismaPg(getPool()) });
  }
  return prismaInstance;
}

export async function disconnectScriptPrisma(): Promise<void> {
  await prismaInstance?.$disconnect();
  prismaInstance = undefined;
  await pool?.end();
  pool = undefined;
}

export const prisma = getScriptPrisma();
