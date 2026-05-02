import brand from "@/config/brand.json";

/** `public/<logoFilename>` (sayfa/OG). Favicon & PWA: `iconSourceFilename` → `npm run icons:pwa`. */
export const BRAND_LOGO_PATH = `/${brand.logoFilename}` as const;
