import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncDefaultCategorySubtrees } from "../src/lib/defaultCategorySubtrees";
import { DEFAULT_MAIN_CATEGORY_NAMES } from "../src/lib/mainCategoryNames";
import {
  DEFAULT_ENGINEERING_PROFESSIONS,
  syncDefaultProfessions,
} from "../src/lib/defaultProfessions";
import { nextMemberNumber } from "../src/lib/memberNumber";
import { hashPassword } from "../src/lib/passwordHash";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "admin123").trim();
  const adminPasswordHash = await hashPassword(adminPassword);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name: "Administrator",
          password: adminPasswordHash,
          /** Ana seed hesabı süper yönetici (tek hesap; ek yöneticiler panelden ADMIN) */
          role: "SUPER_ADMIN",
        },
      });
    } else {
      const n = await nextMemberNumber(tx);
      await tx.user.create({
        data: {
          email: adminEmail,
          name: "Administrator",
          password: adminPasswordHash,
          role: "SUPER_ADMIN",
          memberNumber: n,
        },
      });
    }
  });

  await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      bidFeeEnabled: false,
      bidFeeAmountTry: 0,
    },
  });

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_MAIN_CATEGORY_NAMES.map((name, i) => ({
        name,
        sortOrder: i,
      })),
    });
  }
  await syncDefaultCategorySubtrees(prisma);
  console.log("Varsayilan alt kategoriler senkronize edildi.");

  await syncDefaultProfessions(prisma);
  console.log(`Meslek listesi senkronize edildi (${DEFAULT_ENGINEERING_PROFESSIONS.length} tanim).`);

  console.log(`Seed completed. Admin: ${adminEmail} / ${adminPassword}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
