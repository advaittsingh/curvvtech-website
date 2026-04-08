export type ProfileNavItem = {
  href: string
  label: string
  description: string
}

/** Sections listed on the overview hub (excludes overview itself). */
export const PROFILE_SECTION_ITEMS: ProfileNavItem[] = [
  {
    href: '/profile/user',
    label: 'User details',
    description: 'Name, contact, and business basics tied to your account.',
  },
  {
    href: '/profile/business',
    label: 'Business questionnaire',
    description: 'Tell us about your business so follow-ups stay on-brand.',
  },
]

export const PROFILE_SIDEBAR_ITEMS: ProfileNavItem[] = [
  {
    href: '/profile',
    label: 'Overview',
    description: 'See all profile sections in one place.',
  },
  ...PROFILE_SECTION_ITEMS,
]
