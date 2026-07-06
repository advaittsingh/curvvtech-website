export type ServiceAccent = "purple" | "blue" | "orange" | "green" | "pink" | "violet";

export const SERVICE_ACCENTS: Record<ServiceAccent, { bg: string; txt: string }> = {
  purple: { bg: "bg-purple/20", txt: "text-purple" },
  blue: { bg: "bg-blue/20", txt: "text-blue" },
  orange: { bg: "bg-orange/20", txt: "text-orange" },
  green: { bg: "bg-green/20", txt: "text-green" },
  pink: { bg: "bg-pink/20", txt: "text-pink" },
  violet: { bg: "bg-violet/20", txt: "text-violet" },
};

export type CatalogService = {
  slug: string;
  title: string;
  displayTitle: string;
  description: string;
  icon: string;
  accent: ServiceAccent;
  sort_order: number;
};

export const defaultServicesCatalog: CatalogService[] = [
  {
    slug: "web-development",
    title: "Web Development",
    displayTitle: "Web\nDevelopment",
    description: "Modern, scalable web applications that perform.",
    icon: "/images/home/innovation/webdevp.svg",
    accent: "purple",
    sort_order: 0,
  },
  {
    slug: "app-development",
    title: "App Development",
    displayTitle: "App\nDevelopment",
    description: "Native and cross-platform mobile apps that users love.",
    icon: "/images/home/innovation/uiux.svg",
    accent: "blue",
    sort_order: 1,
  },
  {
    slug: "backend-api-development",
    title: "Backend & API Development",
    displayTitle: "Backend &\nAPI Development",
    description: "Robust backends and APIs that power your product.",
    icon: "/images/home/innovation/analitics.svg",
    accent: "orange",
    sort_order: 2,
  },
  {
    slug: "ai-automation-solutions",
    title: "AI / Automation Solutions",
    displayTitle: "AI /\nAutomation Solutions",
    description: "Intelligent automation and AI-driven features.",
    icon: "/images/home/innovation/digitalmarketing.svg",
    accent: "green",
    sort_order: 3,
  },
  {
    slug: "saas-product-development",
    title: "SaaS Product Development",
    displayTitle: "SaaS Product\nDevelopment",
    description: "End-to-end SaaS products built to scale.",
    icon: "/images/home/innovation/brand.svg",
    accent: "pink",
    sort_order: 4,
  },
  {
    slug: "custom-software-development",
    title: "Custom Software Development",
    displayTitle: "Custom Software\nDevelopment",
    description: "Tailored software solutions for your unique needs.",
    icon: "/images/home/innovation/webdevp.svg",
    accent: "violet",
    sort_order: 5,
  },
];

export function getServiceTheme(slug: string, accent?: string) {
  const catalog = defaultServicesCatalog.find((s) => s.slug === slug);
  const key = (accent ?? catalog?.accent ?? "purple") as ServiceAccent;
  return SERVICE_ACCENTS[key] ?? SERVICE_ACCENTS.purple;
}

export const innovationList = defaultServicesCatalog.map((s) => {
  const theme = SERVICE_ACCENTS[s.accent];
  return {
    slug: s.slug,
    image: s.icon,
    title: s.displayTitle,
    bg_color: theme.bg,
    txt_color: theme.txt,
    description: s.description,
  };
});
