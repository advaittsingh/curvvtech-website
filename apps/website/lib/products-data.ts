export type Product = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  /** Card grid on /products (same layout as /work) */
  cardImage: string;
  /** Shown under title like Work project tags (joined with ·) */
  tags?: string[];
  bg_color: string;
  txt_color: string;
};

const followUpCardImage =
  '/images/Products/Follow-Up/Black Modern Website Launch Promotion Mockup Instagram Post.png';

export const products: Product[] = [
  {
    slug: 'follow-up',
    name: 'Follow Up',
    description:
      'Automate personalized follow-ups for your sales and support teams—built for WhatsApp-first workflows and growing teams.',
    websiteUrl: 'https://followup.curvvtech.com/',
    cardImage: followUpCardImage,
    tags: ['SaaS', 'WhatsApp-first', 'Sales & support'],
    bg_color: 'bg-purple/20',
    txt_color: 'text-purple',
  },
];

export function getAllProducts(): Product[] {
  return products;
}
