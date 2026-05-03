import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_MAIN_CATEGORY_NAMES } from "@/lib/mainCategoryNames";

/**
 * Ana kategoriler `DEFAULT_MAIN_CATEGORY_NAMES` ile eşleşir.
 * Varsayılan alt listeler boş; alt kategorileri yönetim panelinden ekleyin.
 * `syncDefaultCategorySubtrees` yalnızca bu dizilerde tanımlı (ve DB’de olmayan) altları ekler.
 */
const DEFAULT_CATEGORY_SUBTREES: ReadonlyArray<{
  parentName: string;
  children: readonly string[];
}> = [
  {
    parentName: DEFAULT_MAIN_CATEGORY_NAMES[0],
    children: [],
  },
  {
    parentName: DEFAULT_MAIN_CATEGORY_NAMES[1],
    children: [],
  },
  {
    parentName: DEFAULT_MAIN_CATEGORY_NAMES[2],
    children: [],
  },
  {
    parentName: DEFAULT_MAIN_CATEGORY_NAMES[3],
    children: [],
  },
];

/** Eksik alt kategorileri toplu ekler; mevcut kayıtlara dokunmaz (isim+parentId benzersiz). */
export async function syncDefaultCategorySubtrees(db: PrismaClient): Promise<void> {
  if (!db.category || typeof db.category.findMany !== "function") {
    return;
  }

  const parentNames = DEFAULT_CATEGORY_SUBTREES.map((s) => s.parentName);
  const roots = await db.category.findMany({
    where: { parentId: null, name: { in: [...parentNames] } },
  });
  const rootByName = new Map(roots.map((r) => [r.name, r]));
  const parentIds = roots.map((r) => r.id);
  if (parentIds.length === 0) {
    return;
  }

  const existing = await db.category.findMany({
    where: { parentId: { in: parentIds } },
    select: { parentId: true, name: true },
  });
  const key = (parentId: string, name: string) => `${parentId}\0${name}`;
  const have = new Set(
    existing.flatMap((e) => (e.parentId != null ? [key(e.parentId, e.name)] : [])),
  );

  const toCreate: { name: string; parentId: string; sortOrder: number }[] = [];
  for (const { parentName, children } of DEFAULT_CATEGORY_SUBTREES) {
    const p = rootByName.get(parentName);
    if (!p) continue;
    const maxRow = await db.category.aggregate({
      where: { parentId: p.id },
      _max: { sortOrder: true },
    });
    let next = (maxRow._max.sortOrder ?? -1) + 1;
    for (const name of children) {
      if (!have.has(key(p.id, name))) {
        toCreate.push({ name, parentId: p.id, sortOrder: next });
        next += 1;
      }
    }
  }

  if (toCreate.length > 0) {
    await db.category.createMany({ data: toCreate });
  }
}
