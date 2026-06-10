"use client";

import { brandList } from "@/lib/brand-data";
import SingleBrand from "./SingleBrand";

function BrandMarquee() {
  const renderLogos = (suffix: string) =>
    brandList.map((brand) => (
      <SingleBrand key={`${brand.id}${suffix}`} brand={brand} />
    ));

  return (
    <div className="client-brand-marquee group relative w-full overflow-hidden select-none">
      <div className="client-brand-marquee-track flex w-max items-center">
        {renderLogos("")}
        {renderLogos("-dup")}
      </div>
    </div>
  );
}

export default BrandMarquee;
