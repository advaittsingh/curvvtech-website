import { Text, VStack } from '@chakra-ui/react'

export default {
  title: 'Simple plans for serious pipeline',
  description:
    'Start free, scale with automation, or go custom. Book a demo for volume pricing and the right fit.',
  plans: [
    {
      id: 'free',
      title: 'Free Plan',
      description: 'Try the essentials at no cost.',
      price: '₹0',
      features: [
        { title: '1 WhatsApp number' },
        { title: 'Limited chats per month' },
        { title: 'Basic lead tracking (manual)' },
        { title: 'Limited AI replies' },
        { title: 'Basic follow-up reminders' },
      ],
      action: {
        href: '/demo',
        label: 'Book a Demo',
      },
    },
    {
      id: 'growth',
      title: 'Pro Plan',
      description: 'For teams scaling outreach and inbox.',
      price: (
        <VStack align="stretch" spacing={0}>
          <Text fontWeight="semibold">₹399 / month</Text>
          <Text fontSize="sm" color="gray.400">
            or ₹3,999 / year
          </Text>
        </VStack>
      ),
      isRecommended: true,
      features: [
        { title: '1 WhatsApp number' },
        { title: 'Unlimited chats' },
        { title: 'Full lead management (New / Pending / Closed)' },
        { title: 'Smart follow-up reminders & scheduling' },
        { title: 'AI assistant for replies + follow-ups' },
        { title: 'Organized inbox (no messy chats)' },
        { title: 'Basic insights (response time, conversions)' },
      ],
      action: {
        href: '/demo',
        label: 'Book a Demo',
      },
    },
    {
      id: 'enterprise',
      title: 'Pro+ Plan',
      description: 'For teams that need scale, control, and support.',
      price: (
        <VStack align="stretch" spacing={0}>
          <Text fontWeight="semibold">₹799 / month</Text>
          <Text fontSize="sm" color="gray.400">
            or ₹7,999 / year
          </Text>
        </VStack>
      ),
      features: [
        { title: 'Multiple WhatsApp numbers' },
        { title: 'Multi-user access (team usage)' },
        { title: 'Advanced analytics & insights' },
        { title: 'Automation features (auto follow-ups, workflows)' },
        { title: 'Priority support' },
        { title: 'Custom integrations & setup' },
      ],
      action: {
        href: '/demo',
        label: 'Book a Demo',
      },
    },
  ],
}
