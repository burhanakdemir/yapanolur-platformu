export type CategoryTreeNode = { id: string; name: string; children: CategoryTreeNode[] };

function subtreeContainsId(nodes: CategoryTreeNode[], targetId: string): boolean {
  for (const n of nodes) {
    if (n.id === targetId) return true;
    if (subtreeContainsId(n.children, targetId)) return true;
  }
  return false;
}

/**
 * Kayıtlı `categoryId` (yaprak veya ara düğüm) için yeni ilan formundaki
 * ana kategori + alt kategori seçimini doldurur.
 */
export function resolveMainSubCategoryIds(
  tree: CategoryTreeNode[],
  leafCategoryId: string | null | undefined,
): { mainCategoryId: string; subCategoryId: string } {
  if (!leafCategoryId) return { mainCategoryId: "", subCategoryId: "" };
  for (const top of tree) {
    if (top.id === leafCategoryId) return { mainCategoryId: top.id, subCategoryId: "" };
    if (subtreeContainsId(top.children, leafCategoryId)) {
      return { mainCategoryId: top.id, subCategoryId: leafCategoryId };
    }
  }
  return { mainCategoryId: "", subCategoryId: "" };
}

export function flattenAllChildren(
  nodes: CategoryTreeNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${" - ".repeat(depth)}${node.name}` },
    ...flattenAllChildren(node.children, depth + 1),
  ]);
}
