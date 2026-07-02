import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/go/",
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
