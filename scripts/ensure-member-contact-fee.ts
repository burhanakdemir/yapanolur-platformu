/**
 * Tek seferlik: AdminSettings hâlâ varsayılan (ücret kapalı, 0 TL) ise
 * meslek sahibi iletişim ücretini açar (50 TL).
 * PostgreSQL (Neon) üzerinde çalışır.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await prisma.adminSettings.updateMany({
    where: {
      id: "singleton",
      memberContactFeeEnabled: false,
      memberContactFeeAmountTry: 0,
    },
    data: {
      memberContactFeeEnabled: true,
      memberContactFeeAmountTry: 50,
    },
  });
  console.log("memberContactFee guncellendi, satir:", r.count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
