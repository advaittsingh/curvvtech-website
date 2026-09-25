const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.curvvtech.in").replace(/\/$/, "");

const CMS_REVALIDATE_SECONDS = 300;
const CMS_TIMEOUT_MS = 2500;

export type CmsService = {
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  hero_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  content_json?: { accent?: string } | null;
  sort_order?: number;
};

export type CmsPortfolio = {
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  project_url?: string | null;
  tags?: string[];
  case_study_body?: string | null;
  metrics_json?: Record<string, string | number> | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type CmsBlog = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  featured_image_url?: string | null;
  updatedAt?: string;
  category_name?: string | null;
};

async function fetchCms<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/content/${path}`, {
      next: { revalidate: CMS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchCmsServices() {
  return fetchCms<CmsService>("services");
}

export async function fetchCmsServiceBySlug(slug: string): Promise<CmsService | null> {
  const services = await fetchCmsServices();
  return services.find((service) => service.slug === slug) ?? null;
}

export async function fetchCmsPortfolio() {
  return fetchCms<CmsPortfolio>("portfolio");
}

export async function fetchCmsPortfolioBySlug(slug: string): Promise<CmsPortfolio | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/content/portfolio/${encodeURIComponent(slug)}`, {
      next: { revalidate: CMS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
    });
    if (res.ok) return (await res.json()) as CmsPortfolio;
  } catch {
    // Fall through to the list endpoint so a flaky by-slug request does not 404 a live project.
  }
  const all = await fetchCmsPortfolio();
  return all.find((item) => item.slug === slug) ?? null;
}

export async function fetchCmsBlogs() {
  return fetchCms<CmsBlog>("blogs");
}

export async function fetchCmsBlogBySlug(slug: string): Promise<CmsBlog | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/content/blogs/${encodeURIComponent(slug)}`, {
      next: { revalidate: CMS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsBlog;
  } catch {
    return null;
  }
}
