"use client";

import { HomeStyleProjectGrid } from "@/components/project/home-style-project-grid";
import { onlinePresenceList } from "@/lib/site-page-data";
import type { CmsPortfolio } from "@/lib/cms-api";

type WorkItem = {
  image: string;
  title: string;
  tag: string[];
  link: string;
};

export default function WorkGrid({ cmsPortfolio = [] }: { cmsPortfolio?: CmsPortfolio[] }) {
  const staticList = onlinePresenceList as WorkItem[];
  const list: WorkItem[] = cmsPortfolio.length
    ? cmsPortfolio.map((p) => ({
        image: p.image_url || staticList[0]?.image || "/images/home/online-presence/onlinePresence_1.png",
        title: p.title,
        tag: Array.isArray(p.tags) ? p.tags : [],
        link: p.project_url || "#",
      }))
    : staticList;

  if (!list?.length) return null;

  const items = list
    .map((item, index) => ({
      id: `${item.title}-${index}`,
      image: item.image,
      title: item.title,
      tags: item.tag ?? [],
      link: item.link,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  return <HomeStyleProjectGrid items={items} sectionId="work" />;
}
