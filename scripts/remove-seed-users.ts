/**
 * Ornek seed uyelerini siler (ilanlari CASCADE ile gider). Gercek uyelere dokunmaz.
 *
 * npm run seed:remove-gercek
 * npm run seed:remove-demo
 */
import { disconnectScriptPrisma, prisma } from "./lib/prisma";

const SUFFIX_BY_ARG: Record<string, string> = {
  gercek: "@seed-gercek.local",
  demo: "@ornek-demo.local",
};

async function main() {
  const key = process.argv[2]?.toLowerCase();
  const suffix = key ? SUFFIX_BY_ARG[key] : undefined;
  if (!suffix) {
    console.error("Kullanim: npx tsx scripts/remove-seed-users.ts <gercek|demo>");
    process.exit(1);
  }

  const count = await prisma.user.count({ where: { email: { endsWith: suffix } } });
  if (count === 0) {
    console.log(`Silinecek uye yok (${suffix}).`);
    return;
  }

  const r = await prisma.user.deleteMany({ where: { email: { endsWith: suffix } } });
  console.log(`Silinen uye: ${r.count} (${suffix})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectScriptPrisma());
