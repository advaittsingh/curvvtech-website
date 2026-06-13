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
  PhoneCall,
  MessageCircle,
  CalendarDays,
} from "lucide-react";
import type { Permission } from "@/types/auth";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    label: "Sales",
    items: [
      { title: "Leads", href: "/leads", icon: Inbox, permission: "leads.view" },
      { title: "Clients", href: "/clients", icon: Users, permission: "clients.view" },
      { title: "Proposals", href: "/proposals", icon: FileSignature, permission: "proposals.view" },
      { title: "Demo requests", href: "/demo-requests", icon: CalendarDays, permission: "leads.view" },
      { title: "AI agent", href: "/dashboard/ai-agent", icon: PhoneCall, permission: "leads.edit" },
      { title: "Chat", href: "/chat-dashboard", icon: MessageCircle, permission: "leads.view" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { title: "Projects", href: "/projects", icon: FolderKanban, permission: "projects.view" },
      { title: "Tasks", href: "/tasks", icon: ListTodo, permission: "projects.view" },
      { title: "Files", href: "/files", icon: Files, permission: "projects.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Invoices", href: "/invoices", icon: Receipt, permission: "invoices.view" },
      { title: "Payments", href: "/payments", icon: CreditCard, permission: "invoices.view" },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Services", href: "/content/services", icon: Briefcase, permission: "content.view" },
      { title: "Portfolio", href: "/content/portfolio", icon: Image, permission: "content.view" },
      { title: "Blogs", href: "/blogs", icon: FileText, permission: "content.view" },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Team", href: "/team", icon: UserCog, permission: "team.manage" },
      { title: "Roles", href: "/team/roles", icon: Shield, permission: "team.manage" },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Settings", href: "/settings", icon: Settings, permission: "settings.manage" }],
  },
];

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  group: string;
  permission?: Permission;
};

export const GLOBAL_SEARCH_ITEMS: SearchItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    id: item.href,
    title: item.title,
    href: item.href,
    group: g.label || "General",
    permission: item.permission,
  })),
);
