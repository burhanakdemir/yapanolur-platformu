import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncDefaultCategorySubtrees } from "@/lib/defaultCategorySubtrees";
import {
  DEFAULT_MAIN_CATEGORY_NAMES,
  LEGACY_MAIN_CATEGORY_RENAMES,
} from "@/lib/mainCategoryNames";

export type CategoryNode = {
  id: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  children: CategoryNode[];
};

export { DEFAULT_MAIN_CATEGORY_NAMES } from "@/lib/mainCategoryNames";

async function renameLegacyMainCategoryNames(): Promise<void> {
  for (const [from, to] of LEGACY_MAIN_CATEGORY_RENAMES) {
    await prisma.category.updateMany({
      where: { parentId: null, name: from },
      data: { name: to },
    });
  }
}

function sortCategoryChildren(node: CategoryNode): void {
  node.children.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"),
  );
  for (const ch of node.children) sortCategoryChildren(ch);
}

/** Bos veritabaninda ilk kurulumda ornek dort ana kategori; sonrasinda ust/alt sinirsiz panelden yonetilir. */
export async function ensureDefaultTopCategories() {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: DEFAULT_MAIN_CATEGORY_NAMES.map((name, i) => ({
        name,
        sortOrder: i,
      })),
    });
  }
  await renameLegacyMainCategoryNames();
  try {
    await syncDefaultCategorySubtrees(prisma);
  } catch (syncErr) {
    console.error("[categories] syncDefaultCategorySubtrees:", syncErr);
  }
}

/** Ana sayfa gibi sık çağrılan yerlerde ağaç sorgusunu kısa süre önbelleğe alır. */
export async function getCategoryTreeCached() {
  return unstable_cache(
    async () => getCategoryTree(),
    ["category-tree-v1"],
    { revalidate: 120 },
  )();
}

export async function getCategoryTree() {
  const list = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { name: "asc" }],
  });
  const map = new Map<string, CategoryNode>();
  for (const c of list) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl ?? null,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
  for (const r of roots) sortCategoryChildren(r);
  return roots;
}

/**
 * Kok (parentId=null) kategoriler kalir; tum alt kategoriler silinir.
 * Ilgili ilanlarin categoryId alani null yapilir.
 */
export async function deleteAllSubcategoriesFromDb(): Promise<{
  deleted: number;
  adsDetached: number;
}> {
  return prisma.$transaction(async (tx) => {
    const subRows = await tx.category.findMany({
      where: { parentId: { not: null } },
      select: { id: true },
    });
    const subIds = subRows.map((r) => r.id);
    if (subIds.length === 0) {
      return { deleted: 0, adsDetached: 0 };
    }

    const adsUpdate = await tx.ad.updateMany({
      where: { categoryId: { in: subIds } },
      data: { categoryId: null },
    });

    let deleted = 0;
    const maxSteps = subIds.length + 64;
    for (;;) {
      if (deleted > maxSteps) {
        throw new Error("Alt kategori silme dongusu beklenmedik sekilde durdu.");
      }
      const leaf = await tx.category.findFirst({
        where: {
          parentId: { not: null },
          children: { none: {} },
        },
        select: { id: true },
      });
      if (!leaf) break;
      await tx.category.delete({ where: { id: leaf.id } });
      deleted++;
    }

    return { deleted, adsDetached: adsUpdate.count };
  });
}

/**
 * Verilen kok kategori ID'sinin altindaki tum kategorileri siler (kok kalir).
 */
export async function deleteSubcategoriesUnderRootId(rootId: string): Promise<{
  deleted: number;
  adsDetached: number;
}> {
  const descendantIds = await getDescendantIds(rootId);
  const toRemove = descendantIds.filter((id) => id !== rootId);
  if (toRemove.length === 0) {
    return { deleted: 0, adsDetached: 0 };
  }

  return prisma.$transaction(async (tx) => {
    const adsUpdate = await tx.ad.updateMany({
      where: { categoryId: { in: toRemove } },
      data: { categoryId: null },
    });

    let deleted = 0;
    const maxSteps = toRemove.length + 64;
    for (;;) {
      if (deleted > maxSteps) {
        throw new Error("Alt kategori silme dongusu beklenmedik sekilde durdu.");
      }
      const leaf = await tx.category.findFirst({
        where: {
          id: { in: toRemove },
          parentId: { not: null },
          children: { none: {} },
        },
        select: { id: true },
      });
      if (!leaf) break;
      await tx.category.delete({ where: { id: leaf.id } });
      deleted++;
    }

    return { deleted, adsDetached: adsUpdate.count };
  });
}

/**
 * Kaynak kokun alt agacini hedef kokun altina kopyalar.
 * Ayni isim hedefte zaten varsa o dugume baglanir (ic ice birlestirme).
 */
export async function copyCategorySubtreeFromRootToRoot(
  sourceRootId: string,
  targetRootId: string,
): Promise<{ created: number }> {
  if (sourceRootId === targetRootId) {
    throw new Error("Kaynak ve hedef kok ayni olamaz.");
  }
  let created = 0;

  async function walk(oldParentId: string, newParentId: string): Promise<void> {
    const children = await prisma.category.findMany({
      where: { parentId: oldParentId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    for (const ch of children) {
      const existing = await prisma.category.findFirst({
        where: { parentId: newParentId, name: ch.name },
      });
      const targetChildId = existing
        ? existing.id
        : (
            await prisma.category.create({
              data: {
                name: ch.name,
                parentId: newParentId,
                sortOrder: ch.sortOrder,
              },
            })
          ).id;
      if (!existing) created++;
      await walk(ch.id, targetChildId);
    }
  }

  await walk(sourceRootId, targetRootId);
  return { created };
}

export async function getDescendantIds(rootId: string) {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const children = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    if (!children.has(c.parentId)) children.set(c.parentId, []);
    children.get(c.parentId)!.push(c.id);
  }
  const result: string[] = [rootId];
  const stack: string[] = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    const next = children.get(current) || [];
    for (const n of next) {
      result.push(n);
      stack.push(n);
    }
  }
  return result;
}
