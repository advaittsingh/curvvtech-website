import type { CSSProperties } from "react";
import Image from "next/image";
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_WIDTH,
  BRAND_SLOT_PADDING_X,
  type BrandItem,
} from "@/lib/brand-data";

const SingleBrand = ({ brand }: { brand: BrandItem }) => {
  const boxWidth = brand.displayWidth ?? BRAND_LOGO_WIDTH;
  const boxHeight = brand.displayHeight ?? BRAND_LOGO_HEIGHT;
  const slotWidth = boxWidth + BRAND_SLOT_PADDING_X;

  return (
    <div
      className="client-brand-item flex shrink-0 items-center justify-center"
      style={
        {
          width: slotWidth,
          "--brand-glow": brand.glowColor,
        } as CSSProperties
      }>
      <div
        className="flex items-center justify-center"
        style={{ width: boxWidth, height: boxHeight }}>
        <Image
          src={brand.src}
          alt={brand.title}
          width={brand.width}
          height={brand.height}
          draggable={false}
          className={`client-brand-logo h-full w-full select-none object-contain object-center ${brand.logoClassName ?? ""}`}
        />
      </div>
      <span className="sr-only">{brand.title}</span>
    </div>
  );
};

export default SingleBrand;
