import { resolveCategoryImageUrl, type CategoryImageNode } from "@/lib/categoryImage";

/** Prisma `category` + iç içe `parent` (imageUrl ile); kök kaynakta `parent` olmayabilir. */
export type CategoryWithAncestors = {
  id: string;
  name: string;
  imageUrl: string | null;
  parent?: CategoryWithAncestors | null;
} | null;

/**
 * Ana sayfa / API kartları: kök = üst kategori adı, atanmış kayıt kök değilse = alt kategori adı,
 * görsel = yapraktan köke ilk dolu imageUrl.
 */
export function getCategoryCardLabels(category: CategoryWithAncestors): {
  mainLabel: string;
  subLabel: string | null;
  imageUrl: string | null;
} | null {
  if (!category) return null;

  let root = category;
  while (root.parent) {
    root = root.parent;
  }
  const mainLabel = root.name;
  const subLabel = category.id === root.id ? null : category.name;
  const imageUrl = resolveCategoryImageUrl(category as unknown as CategoryImageNode);

  return { mainLabel, subLabel, imageUrl };
}
