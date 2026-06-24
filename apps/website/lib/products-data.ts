export type Product = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  /** Card grid on /products (same layout as /work) */
  cardImage: string;
  /** Shown under title like Work project tags (joined with ·) */
  tags?: string[];
  /** Optional CTA label shown on the product card */
  ctaLabel?: string;
  bg_color: string;
  txt_color: string;
};

const followUpCardImage =
  '/images/Products/Follow-Up/Black Modern Website Launch Promotion Mockup Instagram Post.png';

const businessOsCardImage = '/images/Products/Business-OS/card-mockup.svg';

export const products: Product[] = [
  {
    slug: 'follow-up',
    name: 'Follow Up',
    description:
      'Automate personalized follow-ups for your sales and support teams—built for WhatsApp-first workflows and growing teams.',
    websiteUrl: 'https://followup.curvvtech.com/',
    cardImage: followUpCardImage,
    tags: ['SaaS', 'WhatsApp-first', 'Sales & support'],
    ctaLabel: 'Explore Follow Up',
    bg_color: 'bg-purple/20',
    txt_color: 'text-purple',
  },
  {
    slug: 'business-os',
    name: 'Business OS',
    description:
      'The operating system for running a business. Deploy AI employees for sales, ads, finance, HR and ops — one platform, one business brain, zero context switching.',
    websiteUrl: '/business-os',
    cardImage: businessOsCardImage,
    tags: ['AI Workforce', 'Autonomous Agents', 'Business OS'],
    ctaLabel: 'Explore Business OS',
    bg_color: 'bg-blue/20',
    txt_color: 'text-blue',
  },
];

export function getAllProducts(): Product[] {
  return products;
}
