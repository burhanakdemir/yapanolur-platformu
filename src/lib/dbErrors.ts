import { Prisma } from "@/generated/prisma/client";

/** Hata + cause zincirinin tam metni (Prisma "Invalid `prisma`..." üstünde asıl neden genelde cause'da). */
export function collectErrorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 10 && current != null; depth++) {
    if (current instanceof Error) {
      parts.push(current.message);
      const errno = current as NodeJS.ErrnoException;
      if (typeof errno.code === "string") parts.push(`code:${errno.code}`);
      current = current.cause;
    } else {
      try {
        parts.push(typeof current === "object" ? JSON.stringify(current) : String(current));
      } catch {
        parts.push(String(current));
      }
      break;
    }
  }
  return parts.join("\n");
}

/** Prisma / pg: sunucuya ulaşılamıyor, reddedildi, zaman aşımı vb. */
export function isLikelyDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (
      error.code === "P1001" ||
      error.code === "P1000" ||
      error.code === "P1017" ||
      error.code === "P1003"
    ) {
      return true;
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const text = collectErrorChainText(error);
  if (
    /Can't reach database server|Authentication failed against the database server|provided database credentials.*not valid|Server has closed the connection|connection refused|connect ECONNREFUSED|timeout expired|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Connection terminated|getaddrinfo|password authentication failed for user/i.test(
      text,
    )
  ) {
    return true;
  }
  /** Driver adapter / ağ: mesajda yalnızca "Invalid `prisma`" görünür; asıl sebep cause'da. */
  if (
    /Invalid `prisma/i.test(text) &&
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Can't reach database|code:ECONNREFUSED/i.test(text)
  ) {
    return true;
  }
  return false;
}

/**
 * Eksik sütun/tabloyu işaret eden Prisma hataları (ana sayfadaki şema uyarısı için).
 * Geniş anahtar kelime eşleştirmesi kullanılmaz (yanlış pozitif önlenir).
 */
export function isLikelyPrismaSchemaColumnMissing(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    /** P2022: kolon yok · P2021: tablo yok (migration eksik) */
    if (error.code === "P2022" || error.code === "P2021") {
      return true;
    }
  }
  const text = collectErrorChainText(error);
  if (/no such column/i.test(text)) {
    return true;
  }
  if (/does not exist.*column|column.*does not exist/i.test(text)) {
    return true;
  }
  /** PostgreSQL: tablo / ilişki yok (migration eksik) */
  if (/relation\s+".*"\s+does\s+not\s+exist/i.test(text)) {
    return true;
  }
  if (/undefined_table|42P01/i.test(text)) {
    return true;
  }
  return false;
}

const DB_USER_MESSAGE =
  "PostgreSQL sunucusuna bağlanılamıyor veya şema eksik. `docker compose up -d` ile yerel veritabanını başlatın veya `DATABASE_URL` değerini kontrol edin; ardından `npx prisma migrate deploy` çalıştırın. Ayrıntı: docs/local-db.md";

export class DatabaseConnectionError extends Error {
  override readonly name = "DatabaseConnectionError";
  constructor(message = DB_USER_MESSAGE) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
