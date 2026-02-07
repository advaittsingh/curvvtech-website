"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AnimatedGridItem } from "@/app/components/ui/animated-grid-item";

type ServiceItem = {
  slug?: string;
  image: string;
  title: string;
  bg_color: string;
  txt_color: string;
};

export default function ServicesList() {
  const [list, setList] = useState<ServiceItem[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/page-data");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setList(data?.innovationList ?? null);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

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
            {item.slug && (
              <span className="text-sm font-medium text-dark_black/60 dark:text-white/60 mt-2">
                View details →
              </span>
            )}
          </>
        );
        const className = `${item.bg_color} flex flex-col p-8 rounded-2xl gap-6 hover:opacity-95 transition-opacity min-h-[200px]`;
        const cell = item.slug ? (
          <Link href={`/services/${item.slug}`} className={className}>
            {content}
          </Link>
        ) : (
          <div className={className}>
            {content}
          </div>
        );
        return (
          <AnimatedGridItem key={index} index={index}>
            {cell}
          </AnimatedGridItem>
        );
      })}
    </div>
  );
}
