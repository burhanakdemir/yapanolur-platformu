/**
 * Öğretici / test bağlantı dizelerini bağlantıdan önce reddeder (örn. Prisma dokümantasyonundaki `postgresql://x:y@...`).
 * Aksi halde PostgreSQL "credentials for x" ile düşer; kullanıcı `.env`'yi yanlış arar.
 *
 * İstisna: gerçekten böyle bir kullanıcı gerekiyorsa `DATABASE_URL_ALLOW_PLACEHOLDER=1`.
 */

export class DatabaseUrlSanityError extends Error {
  override readonly name = "DatabaseUrlSanityError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const LOCAL_DOCKER_HINT =
  "Yerel Docker için örnek: postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev — önce `docker compose up -d`, sonra `npm run db:migrate`. Şablon: `.env.example`, `docs/local-db.md`. Kontrol: `npm run db:doctor`";

function normalizedHttpLikeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!/^postgres(ql)?:\/\//i.test(t)) return null;
  return t.replace(/^postgres(ql)?:/i, "http:");
}

export function getPlaceholderDatabaseUrlIssue(rawUrl: string): string | null {
  if (
    process.env.DATABASE_URL_ALLOW_PLACEHOLDER === "1" ||
    process.env.DATABASE_URL_ALLOW_PLACEHOLDER === "true"
  ) {
    return null;
  }

  const httpLike = normalizedHttpLikeUrl(rawUrl);
  if (!httpLike) return null;

  try {
    const u = new URL(httpLike);
    const user = decodeURIComponent(u.username || "");
    const pass = decodeURIComponent(u.password || "");

    if (user === "x" && pass === "y") {
      return `DATABASE_URL hâlâ klasik örnek adres gibi görünüyor (kullanıcı \`x\`, şifre \`y\`). ${LOCAL_DOCKER_HINT}`;
    }
    if (user === "x") {
      return `DATABASE_URL kullanıcı adı \`x\` — bu çoğu zaman placeholder'dır. Gerçek Postgres kullanıcısıyla güncelleyin. ${LOCAL_DOCKER_HINT}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function assertReasonableDatabaseUrl(rawUrl: string): void {
  const issue = getPlaceholderDatabaseUrlIssue(rawUrl);
  if (issue) {
    throw new DatabaseUrlSanityError(issue);
  }
}

export function isDatabaseUrlConfigurationError(error: unknown): boolean {
  return error instanceof DatabaseUrlSanityError;
}
