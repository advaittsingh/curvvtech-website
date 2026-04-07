import { FiBell, FiLayers, FiMessageSquare, FiZap } from 'react-icons/fi'
import { BRAND_NAME, Logo } from './logo'

const siteConfig = {
  logo: Logo,
  seo: {
    title: BRAND_NAME,
    description:
      'Never lose a lead again. FollowUp automates follow-ups across WhatsApp and email so you close more deals.',
  },
  termsUrl: '#',
  privacyUrl: '#',
  header: {
    links: [
      {
        id: 'benefits',
        label: 'Features',
      },
      {
        id: 'pricing',
        label: 'Pricing',
      },
      {
        id: 'faq',
        label: 'FAQ',
      },
      {
        label: 'Login',
        href: '/login',
      },
      {
        label: 'Book a Demo',
        href: '/demo',
        variant: 'primary',
      },
    ],
  },
  footer: {
    copyright: <>FollowUp helps teams respond on time — every time.</>,
    attribution: 'Developed by curvvtech™. All rights reserved.',
    links: [
      {
        href: '/demo',
        label: 'Book a demo',
      },
    ],
  },
  signup: {
    title: 'Create your account',
    features: [
      {
        icon: FiMessageSquare,
        title: 'Turn chats into leads',
        description:
          'Share a conversation and we automatically create a structured lead.',
      },
      {
        icon: FiBell,
        title: 'Never miss a follow-up',
        description: 'Get reminders so you always know who to reply to.',
      },
      {
        icon: FiLayers,
        title: 'Everything in one place',
        description:
          'Stop switching between chats, notes, and spreadsheets.',
      },
      {
        icon: FiZap,
        title: 'No learning curve',
        description: 'Extremely simple and mobile-first — get started in minutes.',
      },
    ],
  },
}

export default siteConfig
