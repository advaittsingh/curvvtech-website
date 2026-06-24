import { Metadata } from 'next';
import { BusinessOsLanding } from '@/components/business-os/business-os-landing';

export const metadata: Metadata = {
  title: 'Business OS — The Operating System For Running A Business',
  description:
    'Business OS deploys AI employees that perform work — sales, marketing, finance, HR, inventory and operations. One platform. One business brain. Zero context switching.',
  openGraph: {
    title: 'Business OS — This Company Runs Itself.',
    description:
      'The AI workforce operating modern businesses. Hire AI employees instead of more software.',
  },
};

export default function BusinessOsPage() {
  return <BusinessOsLanding />;
}
