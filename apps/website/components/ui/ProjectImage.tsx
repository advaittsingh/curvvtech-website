"use client";

import Image from "next/image";
import { useState } from "react";

const DEFAULT_WORK_IMAGE = "/images/home/onlinePresence/online_img_1.jpg";

function encodedSrc(path: string): string {
  try {
    return path.startsWith("/") ? path.split("/").map((segment) => encodeURIComponent(segment)).join("/") : path;
  } catch {
    return path;
  }
}

type ProjectImageProps = React.ComponentProps<typeof Image> & {
  fallbackSrc?: string;
};

export function ProjectImage({ src, fallbackSrc = DEFAULT_WORK_IMAGE, sizes, quality, ...props }: ProjectImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const displaySrc =
    typeof currentSrc === "string" ? encodedSrc(currentSrc) : currentSrc;
  const isRemote = typeof displaySrc === "string" && displaySrc.startsWith("http");

  return (
    <Image
      {...props}
      src={displaySrc}
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      quality={quality ?? 75}
      unoptimized={isRemote || props.unoptimized}
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}
