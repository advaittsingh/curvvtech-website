"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AnimatedGridItem } from "@/components/ui/animated-grid-item";
import { innovationList } from "@/lib/site-page-data";
import type { CmsService } from "@/lib/cms-api";

type ServiceItem = {
  slug?: string;
  image: string;
  title: string;
  bg_color: string;
  txt_color: string;
  description?: string;
};

const COLORS = [
  { bg: "bg-blue-100", txt: "text-blue-900" },
  { bg: "bg-amber-100", txt: "text-amber-900" },
  { bg: "bg-emerald-100", txt: "text-emerald-900" },
  { bg: "bg-violet-100", txt: "text-violet-900" },
];

function mapCms(services: CmsService[]): ServiceItem[] {
  return services.map((s, i) => {
    const c = COLORS[i % COLORS.length];
    return {
      slug: s.slug || undefined,
      image: s.icon || s.hero_image_url || "/images/documentation/Categories=React.svg",
      title: s.title,
      bg_color: c.bg,
      txt_color: c.txt,
      description: s.description ?? undefined,
    };
  });
}

export default function ServicesList({ cmsServices = [] }: { cmsServices?: CmsService[] }) {
  const list: ServiceItem[] = cmsServices.length ? mapCms(cmsServices) : (innovationList as ServiceItem[]);

  if (!list?.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((item, index) => {
        const content = (
          <>
            <Image src={item.image} alt="" width={40} height={40} />
            <h2 className={`text-2xl font-medium ${item.txt_color}`}>
              {item.title.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </h2>
            {item.description && <p className="text-sm text-dark_black/60 dark:text-white/60 mt-2">{item.description}</p>}
            {item.slug && (
              <span className="text-sm font-medium text-dark_black/60 dark:text-white/60 mt-2">
                View details →
              </span>
            )}
          </>
        );

        const cardClass = `flex flex-col gap-4 p-8 rounded-2xl ${item.bg_color} h-full`;

        return (
          <AnimatedGridItem key={item.slug ?? item.title} index={index}>
            {item.slug ? (
              <Link href={`/services/${item.slug}`} className={`${cardClass} hover:opacity-90 transition-opacity`}>
                {content}
              </Link>
            ) : (
              <div className={cardClass}>{content}</div>
            )}
          </AnimatedGridItem>
        );
      })}
    </div>
  );
}
