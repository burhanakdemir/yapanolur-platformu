/** Kategori zincirinde (yapraktan köke) ilk dolu imageUrl. */
export type CategoryImageNode = {
  imageUrl: string | null;
  parent?: CategoryImageNode | null;
};

export function resolveCategoryImageUrl(cat: CategoryImageNode | null | undefined): string | null {
  let node: CategoryImageNode | null | undefined = cat;
  while (node) {
    const u = node.imageUrl?.trim();
    if (u) return u;
    node = node.parent ?? null;
  }
  return null;
}

/** Prisma: üst kategorilerde görsel aramak için sınırlı derinlikte parent seçimi. */
export function categoryParentSelectDepth(depth: number): object | undefined {
  if (depth <= 0) return undefined;
  return {
    select: {
      imageUrl: true,
      ...(depth > 1 ? { parent: categoryParentSelectDepth(depth - 1) } : {}),
    },
  };
}
