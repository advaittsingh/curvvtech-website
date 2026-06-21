const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.curvvtech.in").replace(/\/$/, "");

export type CmsService = {
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  hero_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type CmsPortfolio = {
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  project_url?: string | null;
  tags?: string[];
  case_study_body?: string | null;
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
    const res = await fetch(`${API_BASE}/api/public/content/${path}`, { next: { revalidate: 60 } });
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

export async function fetchCmsPortfolio() {
  return fetchCms<CmsPortfolio>("portfolio");
}

export async function fetchCmsBlogs() {
  return fetchCms<CmsBlog>("blogs");
}

export async function fetchCmsBlogBySlug(slug: string): Promise<CmsBlog | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/content/blogs/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsBlog;
  } catch {
    return null;
  }
}
