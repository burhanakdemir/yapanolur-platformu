import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/appUrl";
import { getAdminPanelPathPrefix } from "@/lib/adminUrls";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl().replace(/\/+$/, "");
  const adminPrefix = getAdminPanelPathPrefix();
  const disallow = ["/admin/", "/api/", "/panel/", "/g/", "/payments/"];
  if (adminPrefix) {
    disallow.push(`${adminPrefix}/`);
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
