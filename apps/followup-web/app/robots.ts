import type { MetadataRoute } from "next";
import { SITE_URL } from "#lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/signup",
        "/welcome",
        "/onboarding",
        "/usage",
        "/profile",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
