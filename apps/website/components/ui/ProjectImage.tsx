"use client";

import Image from "next/image";
import { useState } from "react";

// Use an image that exists so fallback never 404s (work folder default may be missing)
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

export function ProjectImage({ src, fallbackSrc = DEFAULT_WORK_IMAGE, ...props }: ProjectImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  // Encode path so "LUNE&LUSTRE" and filenames with spaces load correctly (only for string src)
  const displaySrc =
    typeof currentSrc === "string" ? encodedSrc(currentSrc) : currentSrc;

  return (
    <Image
      {...props}
      src={displaySrc}
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}
