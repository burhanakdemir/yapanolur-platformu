import brand from "@/config/brand.json";

/** `public/<logoFilename>` URL’si. Dosyayı değiştirip `npm run icons:pwa` ile ikonları güncelle. */
export const BRAND_LOGO_PATH = `/${brand.logoFilename}` as const;
