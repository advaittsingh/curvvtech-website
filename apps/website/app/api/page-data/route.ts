import { NextResponse } from 'next/server'

const avatarList = [
  {
    image: '/images/home/avatar_1.jpg',
    title: 'Sarah Johnson',
  },
  {
    image: '/images/home/avatar_2.jpg',
    title: 'Olivia Miller',
  },
  {
    image: '/images/home/avatar_3.jpg',
    title: 'Sophia Roberts',
  },
  {
    image: '/images/home/avatar_4.jpg',
    title: 'Isabella Clark',
  },
]

const brandList = [
  {
    image: '/images/home/brand/brand-icon-1.svg',
    darkImg: '/images/home/brand/brand-darkicon-1.svg',
    title: 'Adobe',
  },
  {
    image: '/images/home/brand/brand-icon-2.svg',
    darkImg: '/images/home/brand/brand-darkicon-2.svg',
    title: 'Figma',
  },
  {
    image: '/images/home/brand/brand-icon-3.svg',
    darkImg: '/images/home/brand/brand-darkicon-3.svg',
    title: 'Shopify',
  },
  {
    image: '/images/home/brand/brand-icon-4.svg',
    darkImg: '/images/home/brand/brand-darkicon-4.svg',
    title: 'Dribble',
  },
  {
    image: '/images/home/brand/brand-icon-5.svg',
    darkImg: '/images/home/brand/brand-darkicon-5.svg',
    title: 'Webflow',
  },
]

const innovationList = [
  { slug: 'web-development', image: '/images/home/innovation/webdevp.svg', title: 'Web\nDevelopment', bg_color: 'bg-purple/20', txt_color: 'text-purple' },
  { slug: 'app-development', image: '/images/home/innovation/uiux.svg', title: 'App\nDevelopment', bg_color: 'bg-blue/20', txt_color: 'text-blue' },
  { slug: 'backend-api-development', image: '/images/home/innovation/analitics.svg', title: 'Backend &\nAPI Development', bg_color: 'bg-orange/20', txt_color: 'text-orange' },
  { slug: 'ai-automation-solutions', image: '/images/home/innovation/digitalmarketing.svg', title: 'AI /\nAutomation Solutions', bg_color: 'bg-green/20', txt_color: 'text-green' },
  { slug: 'saas-product-development', image: '/images/home/innovation/brand.svg', title: 'SaaS Product\nDevelopment', bg_color: 'bg-pink/20', txt_color: 'text-pink' },
  { slug: 'custom-software-development', image: '/images/home/innovation/webdevp.svg', title: 'Custom Software\nDevelopment', bg_color: 'bg-purple/20', txt_color: 'text-purple' },
]

// Work projects – one per folder in public/images/work/
const workBase = '/images/work/'
const onlinePresenceList = [
  { image: workBase + 'LUNE&LUSTRE/Lune&Lustre thumbnail.png', title: 'LUNE&LUSTRE', tag: ['E-commerce', 'Web Development'], link: 'https://lune-lustre.vercel.app/' },
  { image: workBase + 'PAATA.AI/Black Modern Website Launch Promotion Mockup Instagram Post (1).png', title: 'PAATA.AI', tag: ['Web Development'], link: 'https://www.paataai.com/' },
  { image: workBase + 'MASAKO INDIA/Masako India Thumbnail.png', title: 'MASAKO INDIA', tag: ['Web Development'], link: 'https://masakoindia.com/' },
  { image: workBase + 'BLAAZE/Black Modern Website Launch Promotion Mockup Instagram Post.png', title: 'BLAAZE', tag: ['Web Development'], link: 'https://www.blaazeleadthethrill.in/' },
  {
    image:
      workBase +
      'LIFESET - CRM /Black Modern Website Launch Promotion Mockup Instagram Post (1).png',
    title: 'LIFESET - CRM',
    tag: ['CRM', 'Web Development'],
    link: '#',
  },
  {
    image:
      workBase + 'TRACKHAUZ/Black Modern Website Launch Promotion Mockup Instagram Post (1).png',
    title: 'TRACKHAUZ',
    tag: ['Web Development'],
    link: '#',
  },
  {
    image:
      workBase +
      'PRIVATE MARKETPLACE TRACKER/Black Modern Website Launch Promotion Mockup Instagram Post.png',
    title: 'PRIVATE MARKETPLACE TRACKER',
    tag: ['Web Development'],
    link: '#',
  },
  {
    image: workBase + 'DREAMZ/Black Modern Website Launch Promotion Mockup Instagram Post.png',
    title: 'DREAMZ',
    tag: ['Web Development'],
    link: '#',
  },
]

const creativeMindList = [
  {
    image: '/images/home/creative/creative_img_1.png',
    name: 'Logan Dang',
    position: 'WordPress Developer',
    twitterLink: 'https://x.com/',
    linkedinLink: 'https://in.linkedin.com/',
  },
  {
    image: '/images/home/creative/creative_img_2.png',
    name: 'Ana Belić',
    position: 'Social Media Specialist',
    twitterLink: 'https://x.com/',
    linkedinLink: 'https://in.linkedin.com/',
  },
  {
    image: '/images/home/creative/creative_img_3.png',
    name: 'Brian Hanley',
    position: 'Product Designer',
    twitterLink: 'https://x.com/',
    linkedinLink: 'https://in.linkedin.com/',
  },
  {
    image: '/images/home/creative/creative_img_4.png',
    name: 'Darko Stanković',
    position: 'UI Designer',
    twitterLink: 'https://x.com/',
    linkedinLink: 'https://in.linkedin.com/',
  },
]

const WebResultTagList = [
  {
    image: '/images/home/result/creativity.svg',
    name: 'Build',
    bg_color: 'bg-purple/20',
    txt_color: 'text-purple',
  },
  {
    image: '/images/home/result/innovation.svg',
    name: 'Launch',
    bg_color: 'bg-blue/20',
    txt_color: 'text-blue',
  },
  {
    image: '/images/home/result/strategy.svg',
    name: 'Scale',
    bg_color: 'bg-orange/20',
    txt_color: 'text-orange',
  },
]

const startupPlanList = [
  {
    plan_bg_color: 'bg-pale-yellow',
    text_color: 'text-dark_black',
    descp_color: 'dark_black/60',
    border_color: 'border-dark_black/10',
    plan_name: 'Starter',
    plan_descp: 'For startups who need dev support. One project or ongoing retainer.',
    plan_price: '$2500',
    icon_img: '/images/home/startupPlan/white_tick.svg',
    plan_feature: [
      'Sprint-based Development',
      'Mid-level Engineers',
      'API & Integration Support',
      'Monthly reporting & analytics',
      '2x Calls Per Month',
      'Code ownership & documentation',
    ],
  },
  {
    plan_bg_color: 'bg-purple_blue',
    text_color: 'text-white',
    descp_color: 'white/60',
    border_color: 'border-white/10',
    plan_name: 'Pro',
    plan_descp: 'Full-stack builds: MVP, web apps, cloud infrastructure, and scaling.',
    plan_price: '$3800',
    icon_img: '/images/home/startupPlan/black_tick.svg',
    plan_feature: [
      'Daily Development Sprints',
      'Senior Engineers & Tech Lead',
      'Cloud & DevOps Setup',
      'Full product lifecycle support',
      '4x Calls Per Month',
      'Code ownership & documentation',
    ],
  },
]

const faqList = [
  {
    faq_que: 'What tech services does Curvvtech offer?',
    faq_ans:
      'Curvvtech builds custom web and mobile applications, REST and GraphQL APIs, and cloud-ready backends. We also help with UI/UX, DevOps and CI/CD, integrations (payments, CRM, analytics), and quality assurance. Share your goals and preferred stack—we map services to your roadmap.',
  },
  {
    faq_que: 'How long does a typical project take?',
    faq_ans:
      'Timelines depend on scope and complexity. A focused landing site or small feature set might take a few weeks; an MVP often lands in roughly two to three months; larger platforms can run several months or longer. After discovery, we give you a phased plan with milestones so expectations stay clear.',
  },
  {
    faq_que: 'How is pricing structured at Curvvtech?',
    faq_ans:
      'We usually work on fixed-price phases or milestone-based quotes for well-defined work, and time-and-materials or monthly retainers when the scope is evolving. Estimates tie to deliverables and timelines—you approve scope and pricing before we start development.',
  },
  {
    faq_que: 'Do you offer ongoing support after project completion?',
    faq_ans:
      'Yes. After launch we can handle bug fixes, security updates, dependency upgrades, and small enhancements through a support retainer or ad hoc requests. We also offer SLAs for business-critical apps—tell us your uptime and response needs.',
  },
  {
    faq_que: 'How often will I receive updates on my project?',
    faq_ans:
      'You get a standing cadence that fits your team—often a weekly summary plus async updates in your preferred channel. Larger engagements typically include sprint reviews or demo calls. If something is blocked or urgent, we surface it right away so you are never guessing where things stand.',
  },
]

const achievementsList = [
  {
    icon: '/images/home/achievement/framer_award.svg',
    dark_icon: '/images/home/achievement/dark_framer_award.svg',
    sub_title: 'Framer Awards',
    title:
      'Celebrated for cutting-edge interaction design and seamless user experiences.',
    year: '2024',
    url: 'https://www.framer.com/@wrap-pixel/',
  },
  {
    icon: '/images/home/achievement/dribble_award.svg',
    dark_icon: '/images/home/achievement/dribble_award.svg',
    sub_title: 'Dribbble Awards',
    title: 'Recognized for creative excellence and innovative design solutions',
    year: '2023',
    url: 'https://dribbble.com/wrappixel',
  },
  {
    icon: '/images/home/achievement/awward_award.svg',
    dark_icon: '/images/home/achievement/dark_awward_award.svg',
    sub_title: 'awwwards Awards',
    title:
      'Honored with the Best Website Design for creativity, usability, and innovation.',
    year: '2022',
    url: 'https://www.framer.com/@wrap-pixel/',
  },
]


export const GET = async () => {
  return NextResponse.json({
    avatarList,
    brandList,
    innovationList,
    onlinePresenceList,
    creativeMindList,
    WebResultTagList,
    startupPlanList,
    faqList,
    achievementsList,
  });
};
