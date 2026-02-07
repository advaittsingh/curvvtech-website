"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatedGridItem } from "@/app/components/ui/animated-grid-item";

type WorkItem = {
  image: string;
  title: string;
  tag: string[];
  link: string;
};

export default function WorkGrid() {
  const [list, setList] = useState<WorkItem[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/page-data");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setList(data?.onlinePresenceList ?? null);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  if (!list?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="work">
      {list.map((item, index) => (
        <AnimatedGridItem key={index} index={index}>
          <Link
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10 hover:border-purple_blue/30 dark:hover:border-purple_blue/30 transition-colors"
          >
            <div className="aspect-4/3 relative bg-dark_black/5 dark:bg-white/5">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="p-5">
              <h2 className="text-xl font-medium text-dark_black dark:text-white group-hover:text-purple_blue transition-colors">
                {item.title}
              </h2>
              {item.tag?.length > 0 && (
                <p className="text-sm text-dark_black/60 dark:text-white/60 mt-1">
                  {item.tag.join(" · ")}
                </p>
              )}
            </div>
          </Link>
        </AnimatedGridItem>
      ))}
    </div>
  );
}
