export const businessOsNav = {
  product: 'Business OS',
  byline: 'by CurvvTech',
  cta: { label: 'Deploy AI Workforce', href: '/contact?product=Business%20OS' },
};

export const commandCenterHero = {
  headline: 'This Company Runs Itself.',
  subheadline: 'Meet Business OS — the AI workforce operating modern businesses.',
  primaryCta: { label: 'Deploy AI Workforce', href: '/contact?product=Business%20OS' },
  secondaryCta: { label: 'Watch Business OS Run', href: '#watch-work' },
};

export const liveCompanyFeed = [
  { id: '1', agent: 'AI Sales Agent', status: 'success' as const, message: 'Closed Deal ₹78,000' },
  { id: '2', agent: 'AI Ad Manager', status: 'success' as const, message: 'Reduced CPA 18%' },
  { id: '3', agent: 'AI Finance Agent', status: 'success' as const, message: 'Invoice Generated' },
  { id: '4', agent: 'AI Inventory Agent', status: 'warn' as const, message: 'Stock Running Low' },
  { id: '5', agent: 'AI HR Agent', status: 'success' as const, message: 'Processed Payroll' },
  { id: '6', agent: 'AI Lead Manager', status: 'success' as const, message: 'Meeting Booked — Apex Industries' },
  { id: '7', agent: 'AI Reporting Agent', status: 'success' as const, message: 'CEO Briefing Compiled' },
  { id: '8', agent: 'AI Sales Agent', status: 'success' as const, message: 'Proposal Sent — ₹4.2L pipeline' },
  { id: '9', agent: 'AI Ad Manager', status: 'success' as const, message: 'Meta ROAS hit 4.8x — scaling spend' },
  { id: '10', agent: 'AI Finance Agent', status: 'success' as const, message: 'Payment Reminder Sent — ₹1.2L' },
] as const;

export const liveActivityFeed = [
  { time: '09:41:02', agent: 'Sales Agent', action: 'Proposal sent to Acme Corp — ₹4.2L' },
  { time: '09:41:18', agent: 'Ad Manager', action: 'Meta campaign ROAS hit 4.8x — scaling budget' },
  { time: '09:41:33', agent: 'Lead Manager', action: 'Lead #4821 qualified — meeting booked' },
  { time: '09:41:47', agent: 'Finance Agent', action: 'Invoice INV-2847 generated — ₹1.8L' },
  { time: '09:42:01', agent: 'Inventory Agent', action: 'Reorder triggered for SKU #1102' },
  { time: '09:42:15', agent: 'Reporting Agent', action: 'Daily CEO briefing compiled' },
  { time: '09:42:28', agent: 'HR Agent', action: 'Payroll batch processed — 847 employees' },
  { time: '09:42:41', agent: 'Sales Agent', action: 'Follow-up sent via WhatsApp — 34 prospects' },
  { time: '09:42:54', agent: 'Ops Agent', action: 'Vendor SLA breach flagged — auto-escalated' },
  { time: '09:43:08', agent: 'Support Agent', action: 'Ticket #882 resolved — CSAT 4.9/5' },
  { time: '09:43:21', agent: 'Ad Manager', action: 'Google Ads bid adjusted — CPA down 11%' },
  { time: '09:43:35', agent: 'Finance Agent', action: 'GST filing draft ready for review' },
] as const;

export const hudMetrics = [
  { label: 'Revenue', value: '₹2.4M', delta: '+18%' },
  { label: 'AI Agents', value: '8 active', delta: 'Live' },
  { label: 'Leads', value: '142 contacted', delta: 'Today' },
  { label: 'Campaigns', value: '14 running', delta: '4.2x ROAS' },
  { label: 'Inventory', value: '94% health', delta: '3 alerts' },
  { label: 'Payroll', value: 'Processed', delta: '847 staff' },
] as const;

export const aiEmployees = [
  {
    id: 'sales',
    name: 'AI Sales Agent',
    role: 'Revenue Operations',
    status: 'Online',
    avatar: 'SA',
    currentTask: 'Negotiating with Apex Industries',
    today: [
      { label: 'Prospects Contacted', value: '127' },
      { label: 'Proposals Sent', value: '34' },
      { label: 'Pipeline Created', value: '₹2.4L' },
    ],
    confidence: 94,
    nextAction: 'Following up in 17 mins',
  },
  {
    id: 'ads',
    name: 'AI Ad Manager',
    role: 'Growth & Acquisition',
    status: 'Online',
    avatar: 'AM',
    currentTask: 'Optimizing Meta campaign for Q3 launch',
    today: [
      { label: 'Campaigns Live', value: '14' },
      { label: 'ROAS Improved', value: '+18%' },
      { label: 'CPA Reduced', value: '-22%' },
    ],
    confidence: 89,
    nextAction: 'Scaling budget in 8 mins',
  },
  {
    id: 'finance',
    name: 'AI Finance Agent',
    role: 'Accounting & Cash Flow',
    status: 'Online',
    avatar: 'FA',
    currentTask: 'Reconciling Q2 transactions',
    today: [
      { label: 'Invoices Generated', value: '28' },
      { label: 'Books Updated', value: 'Real-time' },
      { label: 'Reminders Sent', value: '6' },
    ],
    confidence: 97,
    nextAction: 'Closing books at 6 PM',
  },
  {
    id: 'leads',
    name: 'AI Lead Manager',
    role: 'Pipeline & CRM',
    status: 'Online',
    avatar: 'LM',
    currentTask: 'Qualifying inbound lead #4821',
    today: [
      { label: 'Leads Captured', value: '89' },
      { label: 'Meetings Booked', value: '12' },
      { label: 'CRM Updated', value: '203 contacts' },
    ],
    confidence: 91,
    nextAction: 'Calling prospect in 4 mins',
  },
] as const;

export const businessTimeline = [
  { time: '09:01 AM', event: 'Lead Captured' },
  { time: '09:02 AM', event: 'AI Lead Manager Contacts Prospect' },
  { time: '09:10 AM', event: 'Meeting Scheduled' },
  { time: '10:05 AM', event: 'Proposal Generated' },
  { time: '11:22 AM', event: 'Deal Closed' },
  { time: '11:24 AM', event: 'Invoice Generated' },
  { time: '11:25 AM', event: 'Books Updated' },
  { time: '11:26 AM', event: 'CEO Notified' },
] as const;

export const legacyStack = [
  'CRM', 'ERP', 'HRMS', 'Accounting', 'Project Management', 'Marketing Software', 'Reporting Tools', 'Inventory Systems',
] as const;

export const stackReplacement = {
  platform: 'Business OS',
  stats: [
    { value: '8', label: 'AI Employees' },
    { value: '1', label: 'Platform' },
    { value: '1', label: 'Unified Business Brain' },
  ],
};

export const businessBrain = {
  headline: 'One Business Brain.',
  headlineLine2: 'Multiple AI Employees.',
  description:
    'Every AI employee shares the same knowledge. Revenue flows, tasks move, decisions sync — one intelligence operating your entire company.',
  learns: ['Customers', 'Products', 'Vendors', 'Employees', 'Pricing', 'Processes', 'Inventory', 'Financials'],
  agents: [
    { id: 'sales', label: 'Sales AI', position: 'top' as const },
    { id: 'finance', label: 'Finance AI', position: 'left' as const },
    { id: 'marketing', label: 'Marketing AI', position: 'right' as const },
    { id: 'ops', label: 'Operations AI', position: 'bottom' as const },
  ],
};

export const commandCenterCockpit = {
  title: 'CEO Command Center',
  subtitle: 'Where the owner runs the company — decisions, risks, and autonomous actions in real time',
  metrics: [
    { label: 'Revenue Today', value: '+₹2.4L', delta: '↑ 18% vs yesterday', status: 'up' as const },
    { label: 'AI Employees Active', value: '8 / 8', delta: 'All systems operational', status: 'live' as const },
    { label: 'Deals Closed', value: '6', delta: '₹4.8L pipeline created', status: 'neutral' as const },
    { label: 'Campaign ROAS', value: '4.2x', delta: '+0.8 from last week', status: 'up' as const },
  ],
  ceoBriefing: {
    greeting: 'Good evening, Advait.',
    summary: 'Your AI workforce generated ₹2.4L in revenue today.',
    insights: [
      'Meta campaigns outperformed Google by 2.1x.',
      'Inventory risk detected for SKU #2847.',
      'Three high-intent leads are awaiting follow-up.',
    ],
    recommendedFocus: 'Approve inventory reorder and increase Meta budget.',
  },
  workforceStatus: [
    { name: 'Sales Agent', status: 'Online' as const },
    { name: 'Ad Manager', status: 'Online' as const },
    { name: 'Finance Agent', status: 'Online' as const },
    { name: 'HR Agent', status: 'Online' as const },
    { name: 'Inventory Agent', status: 'Online' as const },
    { name: 'Support Agent', status: 'Online' as const },
    { name: 'Lead Manager', status: 'Online' as const },
    { name: 'Reporting Agent', status: 'Online' as const },
  ],
  aiRecommendation: {
    title: 'High confidence recommendation',
    action: 'Increase Meta spend by ₹12,000/day',
    expected: '+22% revenue',
    confidence: 89,
  },
  risk: {
    title: 'Inventory Risk',
    sku: 'SKU #2847',
    countdownLabel: 'Out of Stock In',
    countdown: '4 Days',
    lossLabel: 'Potential Revenue Loss',
    loss: '₹1.7L',
    confidence: 96,
    actionLabel: 'Approve Reorder',
  },
  autonomousActions: [
    'Generated Invoice #4821',
    'Updated Cashflow Forecast',
    'Sent Proposal to Apex Industries',
    'Booked Demo Call',
    'Optimized Meta Campaign',
    'Qualified Lead #4821',
    'Processed Payroll Batch',
    'Reconciled Q2 Transactions',
    'Scaled Ad Budget +18%',
    'Resolved Support Ticket #882',
  ],
};

export const businessOsInAction = {
  title: 'Business OS in Action',
  subtitle: 'One lead. Eight agents. Zero manual handoffs.',
  steps: [
    { label: 'Lead Captured', agent: null },
    { label: 'Sales Agent', agent: 'Qualifies & scores lead' },
    { label: 'Meeting Booked', agent: null },
    { label: 'Proposal Generated', agent: 'Sales Agent' },
    { label: 'Deal Closed', agent: null },
    { label: 'Invoice Created', agent: 'Finance Agent' },
    { label: 'Books Updated', agent: 'Finance Agent' },
    { label: 'CEO Notified', agent: 'Reporting Agent' },
  ],
};

export const industryTransformations = [
  {
    name: 'Agency',
    without: ['4 Employees managing ops', '12 disconnected tools', 'Missed follow-ups', 'Manual reporting'],
    with: ['AI Sales Agent', 'AI Ad Manager', 'AI Finance Agent', 'AI Reporting Agent'],
    outcome: '85% less manual work',
  },
  {
    name: 'Clinic',
    without: ['Front desk overload', 'Manual scheduling', 'Billing delays', 'Compliance gaps'],
    with: ['AI Lead Manager', 'AI HR Agent', 'AI Finance Agent', 'AI Reporting Agent'],
    outcome: '70% faster patient flow',
  },
  {
    name: 'E-commerce',
    without: ['Ad spend waste', 'Stockouts', 'Support backlog', 'Siloed data'],
    with: ['AI Ad Manager', 'AI Inventory Agent', 'AI Sales Agent', 'AI Finance Agent'],
    outcome: '3.2x operational efficiency',
  },
] as const;

export const whiteLabelMajor = {
  headline: 'Launch Your Own AI Workforce Platform',
  subheadline: 'Deploy Business OS under your own brand.',
  description:
    'Agencies and implementation partners white-label the full AI workforce stack — your logo, your domain, powered by Business OS.',
  benefits: [
    'Custom branding', 'Custom domain', 'Private hosting', 'Enterprise deployment', 'Dedicated support', 'Revenue sharing',
  ],
  cta: { label: 'Become a Partner', href: '/contact?product=Business%20OS&intent=white-label' },
};

export const testimonials = [
  {
    quote: 'We replaced 6 tools and 2 full-time ops roles. Business OS runs our agency while we focus on clients.',
    author: 'Operations Director',
    company: 'Digital Agency, Mumbai',
    metric: '85% less manual work',
  },
  {
    quote: 'The AI employees don\'t just show data — they close deals, send invoices, and flag risks before we see them.',
    author: 'Founder & CEO',
    company: 'E-commerce Brand',
    metric: '₹2.4L revenue in first month',
  },
] as const;

export const roadmapPhases = [
  { phase: 'Phase 1', title: 'White Label Deployments', status: 'active' as const },
  { phase: 'Phase 2', title: 'Industry Specific Solutions', status: 'upcoming' as const },
  { phase: 'Phase 3', title: 'Multi-Tenant SaaS Platform', status: 'upcoming' as const },
  { phase: 'Phase 4', title: 'Autonomous AI Workforce Ecosystem', status: 'future' as const },
] as const;

export const finalCta = {
  headline: 'Hire AI Employees Instead of More Software.',
  subheadline: 'Deploy your AI workforce and automate your entire business.',
  primary: { label: 'Book Demo', href: '/contact?product=Business%20OS' },
  secondary: { label: 'Talk To Sales', href: '/contact?product=Business%20OS&intent=sales' },
};

export const businessOsFooter = {
  links: [
    { label: 'Documentation', href: '/documentation' },
    { label: 'Contact', href: '/contact?product=Business%20OS' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/curvvtech' },
  ],
  copyright: 'Business OS by CurvvTech',
};
