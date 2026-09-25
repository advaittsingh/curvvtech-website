import type { Metadata } from "next";

export const SITE_NAME = "Curvvtech";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.curvvtech.com"
).replace(/\/$/, "");

export const DEFAULT_DESCRIPTION =
  "Curvvtech is a technology agency building custom software, web and mobile apps, AI automation, and SaaS products for businesses that want to scale.";

export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const BRAND_LOGO = "/images/logo/curvvtech-logo-dark.png";

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

type PageSeoOptions = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function absoluteUrl(path: string = ""): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function createPageMetadata(options: PageSeoOptions): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "",
    image,
    imageAlt,
    noIndex = false,
    type = "website",
    publishedTime,
    modifiedTime,
  } = options;

  const url = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : absoluteUrl(DEFAULT_OG_IMAGE);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: ogImage,
          alt: imageAlt ?? `${SITE_NAME} — ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };

  if (noIndex) {
    metadata.robots = NOINDEX_ROBOTS;
  }

  if (type === "article" && (publishedTime || modifiedTime)) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: "article",
      publishedTime,
      modifiedTime,
    };
  }

  return metadata;
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Curvvtech | Tech Agency",
    template: "%s",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "software development",
    "web development",
    "mobile app development",
    "AI automation",
    "SaaS development",
    "custom software",
    "technology agency",
    "Curvvtech",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Curvvtech | Tech Agency",
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: "Curvvtech logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@curvvtech",
    creator: "@curvvtech",
    title: "Curvvtech | Tech Agency",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl(BRAND_LOGO),
  sameAs: [
    "https://www.linkedin.com/company/curvvtech/",
    "https://www.instagram.com/curvvtech/",
    "https://x.com/curvvtech",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-7305670180",
    contactType: "customer service",
    email: "support@curvvtech.in",
    areaServed: "IN",
    availableLanguage: "English",
  },
};

export function articleJsonLd(post: {
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  updatedAt?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.featured_image_url
      ? absoluteUrl(post.featured_image_url)
      : absoluteUrl(DEFAULT_OG_IMAGE),
    dateModified: post.updatedAt ?? undefined,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(BRAND_LOGO),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${post.slug}`),
    },
  };
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(BRAND_LOGO),
    },
  },
};

export function creativeWorkJsonLd(project: {
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  project_url?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description ?? undefined,
    image: project.image_url ? absoluteUrl(project.image_url) : absoluteUrl(DEFAULT_OG_IMAGE),
    url: absoluteUrl(`/work/${project.slug}`),
    ...(project.project_url
      ? { isBasedOn: project.project_url }
      : {}),
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
