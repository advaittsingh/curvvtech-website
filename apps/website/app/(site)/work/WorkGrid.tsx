import { HomeStyleProjectGrid } from "@/components/project/home-style-project-grid";
import { onlinePresenceList } from "@/lib/site-page-data";
import type { CmsPortfolio } from "@/lib/cms-api";

type WorkItem = {
  image: string;
  title: string;
  tag: string[];
  link: string;
  slug?: string;
};

function isLiveUrl(url?: string | null): url is string {
  return Boolean(url && url !== "#" && /^https?:\/\//i.test(url));
}

function cmsToWorkItem(p: CmsPortfolio, fallbackImage: string): WorkItem {
  const liveUrl = isLiveUrl(p.project_url) ? p.project_url : null;
  return {
    image: p.image_url || fallbackImage,
    title: p.title,
    tag: Array.isArray(p.tags) ? p.tags : [],
    slug: !liveUrl && p.slug ? p.slug : undefined,
    link: liveUrl ?? (p.slug ? `/work/${p.slug}` : "#"),
  };
}

export default function WorkGrid({ cmsPortfolio = [] }: { cmsPortfolio?: CmsPortfolio[] }) {
  const staticList = onlinePresenceList as WorkItem[];
  const fallbackImage = staticList[0]?.image || "/images/home/onlinePresence/online_img_1.jpg";
  const staticTitles = new Set(staticList.map((item) => item.title.trim().toLowerCase()));
  const extraCms = cmsPortfolio
    .filter((p) => p.title && !staticTitles.has(p.title.trim().toLowerCase()))
    .map((p) => cmsToWorkItem(p, fallbackImage));
  const list = [...staticList, ...extraCms];

  if (!list.length) return null;

  const items = list.map((item, index) => ({
    id: `${item.title}-${index}`,
    image: item.image,
    title: item.title,
    tags: item.tag ?? [],
    link: item.link,
    ctaLabel: item.slug ? "View case study" : undefined,
  }));

  return <HomeStyleProjectGrid items={items} sectionId="work" />;
}
