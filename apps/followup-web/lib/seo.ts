import type { Metadata } from "next";

export const SITE_NAME = "FollowUp";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://followup.curvvtech.com"
).replace(/\/$/, "");

export const DEFAULT_DESCRIPTION =
  "Never lose a lead again. FollowUp automates follow-ups across WhatsApp and email so your team closes more deals.";

export const DEFAULT_OG_IMAGE = "/opengraph-image";

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
      type: "website",
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

  return metadata;
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FollowUp — Never lose a lead again",
    template: "%s",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "lead follow-up",
    "WhatsApp automation",
    "sales automation",
    "CRM",
    "FollowUp",
    "Curvvtech",
  ],
  authors: [{ name: "Curvvtech", url: "https://www.curvvtech.com" }],
  creator: "Curvvtech",
  publisher: "Curvvtech",
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
    title: "FollowUp — Never lose a lead again",
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: "FollowUp — automated lead follow-ups",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FollowUp — Never lose a lead again",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/static/favicons/favicon.ico",
    apple: "/static/favicons/apple-touch-icon.png",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Curvvtech",
  url: "https://www.curvvtech.com",
};

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Book a demo to see pricing for your team",
  },
  publisher: {
    "@type": "Organization",
    name: "Curvvtech",
    url: "https://www.curvvtech.com",
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Curvvtech",
    url: "https://www.curvvtech.com",
  },
};
