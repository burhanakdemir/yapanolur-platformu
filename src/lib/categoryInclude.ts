/**
 * İlan listelerinde kategori köküne kadar yürümek ve görsel zincirini çözmek için
 * Prisma `category` ilişkisinde çok seviyeli `parent` include üretir.
 */
export function categoryIncludeWithParentChain(levels: number): {
  include: { parent: true | object };
} {
  let inner: true | object = true;
  for (let i = 0; i < levels; i++) {
    inner = { include: { parent: inner } };
  }
  return { include: { parent: inner } };
}
