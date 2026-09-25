import type { MetadataRoute } from "next";
import { getAllCareerSlugs } from "@/lib/careers-data";
import { fetchCmsBlogs, fetchCmsPortfolio } from "@/lib/cms-api";
import { getAllServiceSlugs } from "@/lib/services-data";
import { SITE_URL } from "@/lib/seo";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about-us", priority: 0.8, changeFrequency: "monthly" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/products", priority: 0.8, changeFrequency: "monthly" },
  { path: "/work", priority: 0.8, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/careers", priority: 0.7, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/business-os", priority: 0.8, changeFrequency: "weekly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms-and-conditions", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  const serviceEntries: MetadataRoute.Sitemap = getAllServiceSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/services/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  const careerEntries: MetadataRoute.Sitemap = getAllCareerSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/careers/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const blogs = await fetchCmsBlogs();
  const blogEntries: MetadataRoute.Sitemap = blogs.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const portfolio = await fetchCmsPortfolio();
  const workEntries: MetadataRoute.Sitemap = portfolio
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${SITE_URL}/work/${item.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    }));

  return [
    ...staticEntries,
    ...serviceEntries,
    ...careerEntries,
    ...blogEntries,
    ...workEntries,
  ];
}
