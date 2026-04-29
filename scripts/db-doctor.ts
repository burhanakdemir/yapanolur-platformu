/**
 * Terminale: .env içindeki DATABASE_URL ile doğrudan TCP bağlantısı dener.
 * Çalıştırma: npm run db:doctor
 */
import "dotenv/config";
import { Client } from "pg";
import { resolveDatabaseUrl } from "../src/lib/resolveDatabaseUrl";

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error("DATABASE_URL tanımlı değil. .env dosyası oluşturun (.env.example → kopya).");
  process.exit(1);
}
if (raw.startsWith("file:")) {
  console.error(
    "DATABASE_URL artık SQLite (file:...) değil; PostgreSQL kullanın. Örnek: postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev — docker compose up -d. Bkz. .env.example",
  );
  process.exit(1);
}

const connectionString = resolveDatabaseUrl(raw);
const ssl =
  process.env.DATABASE_SSL_DISABLE === "1" || process.env.DATABASE_SSL_DISABLE === "true"
    ? false
    : undefined;

const timeoutMs = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS) || 15000;

async function main() {
  const client = new Client({
    connectionString,
    ssl,
    connectionTimeoutMillis: timeoutMs,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log("Bağlantı başarılı: PostgreSQL yanıt veriyor.");
    console.log("Sonraki adım: npm run db:migrate (şema yoksa)");
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { code?: string };
    console.error("Bağlantı başarısız:", err.message || e);
    console.error("\nSık görülen nedenler:");
    if (err.code === "ECONNREFUSED" || /ECONNREFUSED/i.test(String(err.message))) {
      console.error(
        "  • Sunucu dinlemiyor: Docker’da mı? → docker compose up -d ve 10 sn bekleyin. Docker yoksa → docs/baglanti-sorun-giderme.md (Neon)",
      );
    }
    if (/password authentication failed|28P01/i.test(String(err.message))) {
      console.error("  • Kullanıcı adı / şifre .env ile docker-compose.yml içindeki POSTGRES_* ile eşleşmeli.");
    }
    if (/timeout|ETIMEDOUT/i.test(String(err.message))) {
      console.error("  • Ağ / güvenlik duvarı veya yanlış host/port.");
    }
    console.error("\nAyrıntı: docs/local-db.md ve docs/baglanti-sorun-giderme.md");
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

void main();
