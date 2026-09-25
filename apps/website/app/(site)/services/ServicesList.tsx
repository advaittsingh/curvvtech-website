"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AnimatedGridItem } from "@/components/ui/animated-grid-item";
import { innovationList } from "@/lib/site-page-data";
import { defaultServicesCatalog, getServiceTheme } from "@/lib/services-catalog";
import type { CmsService } from "@/lib/cms-api";

type ServiceItem = {
  slug?: string;
  image: string;
  title: string;
  bg_color: string;
  txt_color: string;
  description?: string;
};

function mapCms(services: CmsService[]): ServiceItem[] {
  return services.map((s) => {
    const catalog = defaultServicesCatalog.find((c) => c.slug === s.slug);
    const accent =
      (s.content_json as { accent?: string } | null)?.accent ?? catalog?.accent;
    const theme = getServiceTheme(s.slug, accent);
    return {
      slug: s.slug || undefined,
      image: s.icon || catalog?.icon || "/images/home/innovation/webdevp.svg",
      title: catalog?.displayTitle ?? s.title.replace(/ & /g, " &\n").replace(/ \/ /g, " /\n"),
      bg_color: theme.bg,
      txt_color: theme.txt,
      description: s.description ?? catalog?.description,
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
            <Image src={item.image} alt={item.title} width={40} height={40} />
            <h2 className={`text-2xl font-medium ${item.txt_color}`}>
              {item.title.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </h2>
            {item.description && (
              <p className="text-sm text-white/50 mt-1 leading-relaxed">{item.description}</p>
            )}
            {item.slug && (
              <span className={`text-sm font-medium mt-auto ${item.txt_color} opacity-70`}>
                View details →
              </span>
            )}
          </>
        );

        const cardClass = `flex flex-col gap-6 lg:gap-9 p-8 rounded-2xl ${item.bg_color} h-full min-h-[220px] hover:opacity-90 transition-opacity`;

        return (
          <AnimatedGridItem key={item.slug ?? item.title} index={index}>
            {item.slug ? (
              <Link href={`/services/${item.slug}`} className={cardClass}>
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
