"use client";

import { HomeStyleProjectGrid } from "@/components/project/home-style-project-grid";
import { onlinePresenceList } from "@/lib/site-page-data";

type WorkItem = {
  image: string;
  title: string;
  tag: string[];
  link: string;
};

export default function WorkGrid() {
  const list = onlinePresenceList as WorkItem[];
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
