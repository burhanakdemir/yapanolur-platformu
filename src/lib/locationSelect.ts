export type LocationOption = { id: number; name: string };

/** İl listesi yüklendiğinde: initial veya tek il varsa id/adı döner. */
export function resolveProvinceSelection(
  list: LocationOption[],
  initialProvince?: string | null,
): { provinceId: string; provinceName: string } | null {
  if (list.length === 0) return null;
  const trimmed = initialProvince?.trim();
  if (trimmed) {
    const selected = list.find((p) => p.name === trimmed);
    if (selected) {
      return { provinceId: String(selected.id), provinceName: selected.name };
    }
  }
  if (list.length === 1) {
    return { provinceId: String(list[0]!.id), provinceName: list[0]!.name };
  }
  return null;
}
