import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/signin",
        "/signup",
        "/forgot-password",
        "/chat",
        "/checkout",
        "/proposals/",
        "/auth/",
        "/documentation",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
