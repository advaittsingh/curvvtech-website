'use client';

import { HomeStyleProjectGrid } from '@/components/project/home-style-project-grid';
import type { Product } from '@/lib/products-data';

type Props = {
  items: Product[];
};

export default function ProductsList({ items }: Props) {
  if (!items.length) return null;

  const gridItems = items.map((item) => ({
    id: item.slug,
    image: item.cardImage,
    title: item.name,
    description: item.description,
    tags: item.tags ?? [],
    link: item.websiteUrl,
    ctaLabel: item.ctaLabel,
  }));

  return <HomeStyleProjectGrid items={gridItems} sectionId="products" />;
}
