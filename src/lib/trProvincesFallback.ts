import raw from "./trProvincesFallback.json";

export type ProvinceOption = { id: number; name: string };

/** turkiyeapi.dev erişilemediğinde kullanılan 81 il listesi (aynı id’ler). */
export const TR_PROVINCES_FALLBACK: ProvinceOption[] = raw as ProvinceOption[];
