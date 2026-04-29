import { revalidatePath } from "next/cache";

/** Kategori CRUD / sıra değişince ana sayfa ve kategori kullanan sayfaların önbelleğini temizler. */
export function revalidateCategoryRoutes(): void {
  revalidatePath("/");
  revalidatePath("/ads/new");
  revalidatePath("/panel/user");
  revalidatePath("/muhendis-ara");
}
