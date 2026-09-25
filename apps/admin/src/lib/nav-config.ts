import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Users,
  FileSignature,
  FolderKanban,
  ListTodo,
  Files,
  Receipt,
  CreditCard,
  Briefcase,
  Image,
  FileText,
  UserCog,
  Shield,
  Settings,
  MessageCircle,
  CalendarDays,
  Wallet,
  Banknote,
  Workflow,
  Bot,
  Building2,
  Plug,
  Crown,
  Star,
  UsersRound,
  GraduationCap,
} from "lucide-react";
import type { AdminRole, Permission } from "@/types/auth";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: AdminRole[];
  hiddenForRoles?: AdminRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "dashboard.view", hiddenForRoles: ["designer", "developer"] },
      { title: "CEO Command Center", href: "/ceo", icon: Crown, permission: "dashboard.view", hiddenForRoles: ["designer", "developer"] },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Leads", href: "/leads", icon: Inbox, permission: "leads.view" },
      { title: "Inbox", href: "/inbox", icon: MessageCircle, permission: "leads.view" },
      { title: "Clients", href: "/clients", icon: Users, permission: "clients.view" },
      { title: "Proposals", href: "/proposals", icon: FileSignature, permission: "proposals.view" },
      { title: "Inbound opportunities", href: "/demo-requests", icon: CalendarDays, permission: "leads.view" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { title: "Projects", href: "/projects", icon: FolderKanban, permission: "projects.view" },
      { title: "My Work", href: "/my-work", icon: ListTodo, permission: "projects.view" },
      { title: "Tasks", href: "/tasks", icon: ListTodo, permission: "projects.view", hiddenForRoles: ["designer", "developer"] },
      { title: "Files", href: "/files", icon: Files, permission: "projects.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Invoices", href: "/invoices", icon: Receipt, permission: "invoices.view" },
      { title: "Revenue & Collections", href: "/payments", icon: CreditCard, permission: "invoices.view" },
      { title: "Expenses & Profitability", href: "/expenses", icon: Wallet, permission: "invoices.view" },
      { title: "Payroll & Compensation", href: "/payroll", icon: Banknote, permission: "invoices.view" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Team", href: "/team", icon: UserCog, permission: "team.manage" },
      { title: "Careers", href: "/careers", icon: GraduationCap, permission: "team.manage" },
      { title: "Roles & Permissions", href: "/team/roles", icon: Shield, permission: "team.manage" },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Services", href: "/content/services", icon: Briefcase, permission: "content.view" },
      { title: "Portfolio", href: "/content/portfolio", icon: Image, permission: "content.view" },
      { title: "Testimonials", href: "/content/testimonials", icon: Star, permission: "content.view" },
      { title: "Team page", href: "/content/team-page", icon: UsersRound, permission: "content.view" },
      { title: "Blogs", href: "/blogs", icon: FileText, permission: "content.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Automations", href: "/operations/automations", icon: Workflow, permission: "settings.manage" },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Company", href: "/settings/company", icon: Building2, permission: "settings.manage" },
      { title: "Integrations", href: "/settings/integrations", icon: Plug, permission: "settings.manage" },
      { title: "Security", href: "/settings/security", icon: Shield, permission: "settings.manage" },
    ],
  },
];

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  href: string;
  group: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: AdminRole[];
  hiddenForRoles?: AdminRole[];
};

const ALL_NAV_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((item) => item.href));

/** Pick the most specific nav href that matches the current path (avoids highlighting /team when on /team/roles). */
export function getActiveNavHref(pathname: string): string | null {
  const matches = ALL_NAV_HREFS.filter((href) => {
    if (pathname === href) return true;
    if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
    return false;
  });
  if (matches.length === 0) return null;
  return matches.reduce((best, href) => (href.length > best.length ? href : best));
}

export const GLOBAL_SEARCH_ITEMS: SearchItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    id: item.href,
    title: item.title,
    subtitle: g.label || undefined,
    keywords: `${item.title} ${g.label} ${item.href.replace(/\//g, " ")}`,
    href: item.href,
    group: "Pages",
    icon: item.icon,
    permission: item.permission,
    roles: item.roles,
    hiddenForRoles: item.hiddenForRoles,
  })),
);
