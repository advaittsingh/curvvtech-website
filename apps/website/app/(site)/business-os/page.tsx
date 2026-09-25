import { BusinessOsLanding } from '@/components/business-os/business-os-landing';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Business OS — The Operating System For Running A Business',
  description:
    'Business OS deploys AI employees that perform work — sales, marketing, finance, HR, inventory and operations. One platform. One business brain. Zero context switching.',
  path: '/business-os',
});

export default function BusinessOsPage() {
  return <BusinessOsLanding />;
}
