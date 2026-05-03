import type { PrismaClient } from "@/generated/prisma/client";
import {
  ILETI_MERKEZI_ENV_PASS,
  ILETI_MERKEZI_ENV_SENDER,
  ILETI_MERKEZI_ENV_USER,
} from "@/lib/iletMerkeziEnvNames";
import { sendIletiMerkeziSignupOtp } from "@/lib/iletMerkeziSignupSms";

type IletiMerkeziJsonCredentials = {
  user: string;
  pass: string;
  sender: string;
};

function getIletiMerkeziCredentialsFromEnv(): IletiMerkeziJsonCredentials | null {
  const user = process.env[ILETI_MERKEZI_ENV_USER]?.trim() ?? "";
  const pass = process.env[ILETI_MERKEZI_ENV_PASS]?.trim() ?? "";
  const sender = process.env[ILETI_MERKEZI_ENV_SENDER]?.trim() ?? "";
  if (!user || !pass || !sender) return null;
  return { user, pass, sender };
}

/**
 * Eski `Prisma findUnique` + `select` üretiminde alan yok sayılabiliyor; ham SQL şema ile DB uyumluysa her zaman okur.
 */
async function getIletiMerkeziCredentialsFromDb(prisma: PrismaClient): Promise<IletiMerkeziJsonCredentials | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ u: string | null; p: string | null; s: string | null }>>`
      SELECT "iletiMerkeziUser" AS u, "iletiMerkeziPass" AS p, "iletiMerkeziSender" AS s
      FROM "AdminSettings" WHERE "id" = 'singleton' LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    const user = row.u?.trim() ?? "";
    const pass = row.p?.trim() ?? "";
    const sender = row.s?.trim() ?? "";
    if (!user || !pass || !sender) return null;
    return { user, pass, sender };
  } catch {
    return null;
  }
}

/**
 * Süper yönetici panelinde user+pass+sender doluysa veritabanı, aksi halde .env.
 */
export async function resolveIletiMerkeziJsonCredentials(
  prisma: PrismaClient,
): Promise<IletiMerkeziJsonCredentials | null> {
  const fromDb = await getIletiMerkeziCredentialsFromDb(prisma);
  if (fromDb) return fromDb;
  return getIletiMerkeziCredentialsFromEnv();
}

/** Teşhis: `resolveIletiMerkeziJsonCredentials` ile aynı öncelik (önce panel, sonra env). */
export async function getIletiJsonCredentialSource(
  prisma: PrismaClient,
): Promise<"database" | "env" | "none"> {
  const fromDb = await getIletiMerkeziCredentialsFromDb(prisma);
  if (fromDb) return "database";
  if (getIletiMerkeziCredentialsFromEnv()) return "env";
  return "none";
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * İleti Merkezi resmi JSON API ile SMS gönderir.
 *
 * - `options.prisma` verilirse kimlik: önce `AdminSettings` (iletiMerkezi*), yoksa .env.
 * - `options.prisma` yoksa yalnızca `ILETI_MERKEZI_USER` / `ILETI_MERKEZI_PASS` / `ILETI_MERKEZI_SENDER`.
 * - `options.credentials` ile çağrı anında kimlik zorunlu kılınabilir.
 */
export async function sendIletiMerkeziJsonSms(
  phoneE164: string,
  messageText: string,
  options?: {
    prisma?: PrismaClient;
    timeoutMs?: number;
    credentials?: IletiMerkeziJsonCredentials;
  },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let creds: IletiMerkeziJsonCredentials | null = options?.credentials ?? null;
  if (!creds && options?.prisma) {
    creds = await resolveIletiMerkeziJsonCredentials(options.prisma);
  }
  if (!creds) {
    creds = getIletiMerkeziCredentialsFromEnv();
  }
  if (!creds) {
    throw new Error(
      "İleti Merkezi: süper yönetici panelinde (İleti Merkezi JSON SMS) alanları doldurun veya " +
        `${ILETI_MERKEZI_ENV_USER}, ${ILETI_MERKEZI_ENV_PASS} ve ${ILETI_MERKEZI_ENV_SENDER} ortam değişkenlerini tanımlayın.`,
    );
  }
  await sendIletiMerkeziSignupOtp({
    apiKey: creds.user,
    apiSecret: creds.pass,
    sender: creds.sender,
    phoneE164: phoneE164.trim(),
    messageText,
    timeoutMs: Math.min(Math.max(timeoutMs, 3000), 120_000),
  });
}
