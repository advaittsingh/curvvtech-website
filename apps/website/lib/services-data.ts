export type ServiceDetail = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  longDescription: string;
  images: string[];
  icon: string;
  accentColor: string;
  projectIds: number[];
  /** Short highlight bullets (e.g. "SEO-friendly") */
  highlights?: string[];
  /** "What we build" list */
  whatWeBuild?: string[];
  /** "How it works" steps */
  howItWorks?: string[];
  /** "Technologies we use" - category label + comma-separated items */
  technologies?: { category: string; items: string }[];
};

export type ProjectItem = {
  id: number;
  image: string;
  title: string;
  tag: string[];
  link: string;
  serviceSlugs: string[]; // which services this project belongs to
};

// Work projects – one per folder in public/images/work/
const workBase = '/images/work/'
export const projects: ProjectItem[] = [
  { id: 0, image: workBase + 'LUNE&LUSTRE/Lune&Lustre thumbnail.png', title: 'LUNE&LUSTRE', tag: ['E-commerce', 'Web Development'], link: 'https://lune-lustre.vercel.app/', serviceSlugs: ['web-development', 'app-development'] },
  { id: 1, image: workBase + 'PAATA.AI/Black Modern Website Launch Promotion Mockup Instagram Post (1).png', title: 'PAATA.AI', tag: ['Web Development'], link: 'https://www.paataai.com/', serviceSlugs: ['web-development', 'ai-automation-solutions'] },
  { id: 2, image: workBase + 'MASAKO INDIA/Masako India Thumbnail.png', title: 'MASAKO INDIA', tag: ['Web Development'], link: 'https://masakoindia.com/', serviceSlugs: ['web-development'] },
  { id: 3, image: workBase + 'BLAAZE/Black Modern Website Launch Promotion Mockup Instagram Post.png', title: 'BLAAZE', tag: ['Web Development'], link: 'https://www.blaazeleadthethrill.in/', serviceSlugs: ['web-development'] },
  {
    id: 4,
    image:
      workBase +
      'LIFESET - CRM /Black Modern Website Launch Promotion Mockup Instagram Post (1).png',
    title: 'LIFESET - CRM',
    tag: ['CRM', 'Web Development'],
    link: '#',
    serviceSlugs: ['web-development', 'custom-software-development'],
  },
  {
    id: 5,
    image:
      workBase + 'TRACKHAUZ/Black Modern Website Launch Promotion Mockup Instagram Post (1).png',
    title: 'TRACKHAUZ',
    tag: ['Web Development'],
    link: '#',
    serviceSlugs: ['web-development'],
  },
  {
    id: 6,
    image:
      workBase +
      'PRIVATE MARKETPLACE TRACKER/Black Modern Website Launch Promotion Mockup Instagram Post.png',
    title: 'PRIVATE MARKETPLACE TRACKER',
    tag: ['Web Development'],
    link: '#',
    serviceSlugs: ['web-development', 'custom-software-development'],
  },
  {
    id: 7,
    image: workBase + 'DREAMZ/Black Modern Website Launch Promotion Mockup Instagram Post.png',
    title: 'DREAMZ',
    tag: ['Web Development'],
    link: '#',
    serviceSlugs: ['web-development'],
  },
];

export const servicesDetail: ServiceDetail[] = [
  {
    slug: 'web-development',
    title: 'Web Development',
    shortTitle: 'Web Development',
    description: 'Modern, scalable web applications that perform.',
    longDescription: 'We design and develop responsive, fast, and secure web applications tailored to your business goals. From CMS-driven websites and admin dashboards to complex, data-driven web apps, our solutions are built using modern technologies and best practices to ensure performance, scalability, and long-term reliability.',
    images: [
      '/images/home/innovation/web_development.jpg',
      '/images/home/innovation/uiux_design.jpg',
      '/images/home/onlinePresence/online_img_1.jpg',
    ],
    icon: '/images/home/innovation/webdevp.svg',
    accentColor: 'purple',
    projectIds: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    highlights: ['SEO-friendly', 'Conversion-friendly', 'CMS now clearly included'],
    whatWeBuild: [
      'Marketing & corporate websites',
      'CMS-powered websites',
      'E-commerce websites (custom coded, Shopify, Wix, WordPress)',
      'Admin dashboards & internal tools',
      'SaaS web applications',
      'Progressive Web Apps (PWAs)',
    ],
    howItWorks: [
      'Discovery & planning – goals, scope, features',
      'UI/UX design – wireframes & design system',
      'Development – frontend + backend',
      'Testing & optimization',
      'Launch & support',
    ],
    technologies: [
      { category: 'Frontend', items: 'React, Next.js, Tailwind, Vue.js' },
      { category: 'Backend', items: 'Node.js, Django, Firebase' },
      { category: 'CMS', items: 'Custom CMS' },
      { category: 'Hosting', items: 'Vercel, AWS, Cloudflare' },
    ],
  },
  {
    slug: 'app-development',
    title: 'App Development',
    shortTitle: 'App Development',
    description: 'Native and cross-platform mobile apps that users love.',
    longDescription: 'We design and develop mobile applications for iOS and Android, as well as cross-platform solutions. From MVPs to full-featured apps, we focus on performance, usability, and maintainability so your product stands out.',
    images: [
      '/images/home/innovation/uiux_design.jpg',
      '/images/home/onlinePresence/online_img_2.jpg',
      '/images/home/innovation/digital_marketing.jpg',
    ],
    icon: '/images/home/innovation/uiux.svg',
    accentColor: 'blue',
    projectIds: [0, 1, 2],
  },
  {
    slug: 'backend-api-development',
    title: 'Backend & API Development',
    shortTitle: 'Backend & API',
    description: 'Robust backends and APIs that power your product.',
    longDescription: 'We build secure, scalable backends and RESTful or GraphQL APIs that integrate with your frontend and third-party services. Our focus is on clean architecture, documentation, and reliability so your systems can grow without breaking.',
    images: [
      '/images/home/innovation/analytics_reporting.jpg',
      '/images/home/innovation/analitics.svg',
      '/images/home/onlinePresence/online_img_3.jpg',
    ],
    icon: '/images/home/innovation/analitics.svg',
    accentColor: 'orange',
    projectIds: [4, 6, 7],
  },
  {
    slug: 'ai-automation-solutions',
    title: 'AI / Automation Solutions',
    shortTitle: 'AI & Automation',
    description: 'Intelligent automation and AI-driven features.',
    longDescription: 'We help you leverage AI and automation to streamline operations, improve decision-making, and create smarter products. From workflow automation and chatbots to custom ML models and integrations, we bring clarity and execution to your AI strategy.',
    images: [
      '/images/home/innovation/digital_marketing.jpg',
      '/images/home/innovation/digitalmarketing.svg',
      '/images/home/onlinePresence/online_img_4.jpg',
    ],
    icon: '/images/home/innovation/digitalmarketing.svg',
    accentColor: 'green',
    projectIds: [1, 7],
  },
  {
    slug: 'saas-product-development',
    title: 'SaaS Product Development',
    shortTitle: 'SaaS Products',
    description: 'End-to-end SaaS products built to scale.',
    longDescription: 'We design and build SaaS products from concept to launch and beyond. Multi-tenancy, subscriptions, analytics, and integrations are part of our DNA. We combine product thinking with engineering excellence so your SaaS can scale and evolve.',
    images: [
      '/images/home/innovation/brand_strategy.jpg',
      '/images/home/innovation/brand.svg',
      '/images/home/onlinePresence/online_img_2.jpg',
    ],
    icon: '/images/home/innovation/brand.svg',
    accentColor: 'pink',
    projectIds: [1, 4, 7],
  },
  {
    slug: 'custom-software-development',
    title: 'Custom Software Development',
    shortTitle: 'Custom Software',
    description: 'Tailored software solutions for your unique needs.',
    longDescription: 'When off-the-shelf tools fall short, we build custom software that fits your processes and goals. From internal tools and workflows to customer-facing platforms, we deliver solutions that are maintainable, scalable, and aligned with your vision.',
    images: [
      '/images/home/innovation/web_development.jpg',
      '/images/home/onlinePresence/online_img_3.jpg',
      '/images/home/innovation/analytics_reporting.jpg',
    ],
    icon: '/images/home/innovation/webdevp.svg',
    accentColor: 'purple',
    projectIds: [3, 4, 5, 6, 7, 8],
  },
];

const accentMap: Record<string, string> = {
  purple: 'bg-purple/20 text-purple',
  blue: 'bg-blue/20 text-blue',
  orange: 'bg-orange/20 text-orange',
  green: 'bg-green/20 text-green',
  pink: 'bg-pink/20 text-pink',
};

export function getServiceBySlug(slug: string): ServiceDetail | undefined {
  return servicesDetail.find((s) => s.slug === slug);
}

export function getAllServiceSlugs(): string[] {
  return servicesDetail.map((s) => s.slug);
}

export function getProjectsForService(serviceSlug: string): ProjectItem[] {
  const service = getServiceBySlug(serviceSlug);
  if (!service) return [];
  return service.projectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is ProjectItem => p != null);
}

export function getAccentClasses(accent: string): string {
  return accentMap[accent] ?? accentMap.purple;
}
