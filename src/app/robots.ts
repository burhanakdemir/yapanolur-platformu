import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl().replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/panel/", "/g/", "/payments/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
