import {
  UserPlus,
  UserCheck,
  Users,
  FileSignature,
  FileCheck,
  FileX,
  Send,
  FolderPlus,
  Flag,
  CheckSquare,
  CalendarClock,
  RefreshCw,
  ReceiptText,
  BadgeIndianRupee,
  CreditCard,
  Wallet,
  Banknote,
  UserRoundPlus,
  UserRoundMinus,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Webhook,
  Code2,
  ListChecks,
  Building2,
  Archive,
  MessageSquare,
  Mail,
  MessageCircle,
  Slack,
  Smartphone,
  Bell,
  Sparkles,
  FileText,
  ScrollText,
  Timer,
  Trophy,
  Gift,
  BarChart3,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import type {
  ActionDef,
  ConditionOperator,
  TriggerDef,
  WorkflowCategory,
  WorkflowTemplate,
} from "./automations.types";

export const CATEGORIES: { id: WorkflowCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sales", label: "Sales" },
  { id: "projects", label: "Projects" },
  { id: "finance", label: "Finance" },
  { id: "hr", label: "HR" },
  { id: "marketing", label: "Marketing" },
  { id: "custom", label: "Custom" },
];

export const CATEGORY_STYLES: Record<WorkflowCategory, string> = {
  sales: "bg-blue-100 text-blue-700 border-blue-200",
  projects: "bg-violet-100 text-violet-700 border-violet-200",
  finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  hr: "bg-amber-100 text-amber-700 border-amber-200",
  marketing: "bg-pink-100 text-pink-700 border-pink-200",
  custom: "bg-slate-100 text-slate-700 border-slate-200",
};

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "discovery_call", label: "Discovery Call" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

/**
 * Trigger catalog. `live: true` means the backend runner executes it today.
 * Non-live triggers can be configured and saved; they run once backend
 * support is wired for that event.
 */
export const TRIGGERS: TriggerDef[] = [
  // Sales
  {
    key: "lead_status_change",
    label: "Lead Status Changes",
    description: "Runs when a lead moves to a specific stage.",
    category: "sales",
    group: "Sales",
    icon: UserCheck,
    live: true,
    configFields: [
      { key: "to_status", label: "When status changes to", type: "select", options: LEAD_STATUS_OPTIONS },
    ],
  },
  { key: "lead_created", label: "Lead Created", description: "A new lead enters the pipeline.", category: "sales", group: "Sales", icon: UserPlus, live: false },
  { key: "lead_assigned", label: "Lead Assigned", description: "A lead is assigned to a team member.", category: "sales", group: "Sales", icon: Users, live: false },
  { key: "proposal_sent", label: "Proposal Sent", description: "A proposal is sent to a client.", category: "sales", group: "Sales", icon: Send, live: false },
  { key: "proposal_accepted", label: "Proposal Accepted", description: "A client accepts a proposal.", category: "sales", group: "Sales", icon: FileCheck, live: true },
  { key: "proposal_rejected", label: "Proposal Rejected", description: "A client rejects a proposal.", category: "sales", group: "Sales", icon: FileX, live: false },
  { key: "client_created", label: "Client Created", description: "A new client is added.", category: "sales", group: "Sales", icon: Building2, live: false },

  // Delivery / Projects
  { key: "project_created", label: "Project Created", description: "A new project is created.", category: "projects", group: "Delivery", icon: FolderPlus, live: false },
  { key: "milestone_complete", label: "Milestone Complete", description: "A project milestone is completed.", category: "projects", group: "Delivery", icon: Flag, live: false },
  { key: "task_completed", label: "Task Completed", description: "A task is marked done.", category: "projects", group: "Delivery", icon: CheckSquare, live: false },
  { key: "deadline_missed", label: "Deadline Missed", description: "A task or milestone is overdue.", category: "projects", group: "Delivery", icon: CalendarClock, live: false },
  { key: "revision_requested", label: "Revision Requested", description: "A client requests a revision.", category: "projects", group: "Delivery", icon: RefreshCw, live: false },
  { key: "project_completed", label: "Project Completed", description: "A project is marked completed.", category: "projects", group: "Delivery", icon: Trophy, live: false },

  // Finance
  { key: "invoice_created", label: "Invoice Created", description: "A new invoice is generated.", category: "finance", group: "Finance", icon: ReceiptText, live: false },
  { key: "invoice_paid", label: "Invoice Paid", description: "An invoice is fully paid.", category: "finance", group: "Finance", icon: BadgeIndianRupee, live: true },
  { key: "payment_failed", label: "Payment Failed", description: "A payment attempt fails.", category: "finance", group: "Finance", icon: CreditCard, live: false },
  { key: "payment_due", label: "Payment Due", description: "An invoice is approaching its due date.", category: "finance", group: "Finance", icon: Clock, live: false },
  { key: "expense_added", label: "Expense Added", description: "A new expense is recorded.", category: "finance", group: "Finance", icon: Wallet, live: false },
  { key: "salary_processed", label: "Salary Processed", description: "Payroll is processed.", category: "finance", group: "Finance", icon: Banknote, live: false },

  // Team / HR
  { key: "employee_joined", label: "Employee Joined", description: "A new team member joins.", category: "hr", group: "Team", icon: UserRoundPlus, live: false },
  { key: "employee_left", label: "Employee Left", description: "A team member leaves.", category: "hr", group: "Team", icon: UserRoundMinus, live: false },
  { key: "leave_approved", label: "Leave Approved", description: "A leave request is approved.", category: "hr", group: "Team", icon: CalendarCheck, live: false },
  { key: "meeting_scheduled", label: "Meeting Scheduled", description: "A meeting is booked.", category: "hr", group: "Team", icon: CalendarPlus, live: false },

  // System / Schedule
  { key: "schedule_daily", label: "Daily", description: "Runs every day on a schedule.", category: "custom", group: "System", icon: Timer, live: false },
  { key: "schedule_weekly", label: "Weekly", description: "Runs every week on a schedule.", category: "custom", group: "System", icon: CalendarClock, live: false },
  { key: "schedule_monthly", label: "Monthly", description: "Runs every month on a schedule.", category: "custom", group: "System", icon: CalendarClock, live: false },
  { key: "manual", label: "Manual", description: "Triggered manually by a user.", category: "custom", group: "System", icon: ListChecks, live: false },
  { key: "webhook", label: "Webhook", description: "Triggered by an incoming webhook.", category: "custom", group: "System", icon: Webhook, live: false },
  { key: "api", label: "API", description: "Triggered via the API.", category: "custom", group: "System", icon: Code2, live: false },
];

/**
 * Action catalog. `live: true` means the backend runner executes it today.
 */
export const ACTIONS: ActionDef[] = [
  // CRM
  {
    key: "update_lead",
    label: "Update Lead",
    description: "Change a lead's status.",
    group: "CRM",
    icon: UserCheck,
    live: true,
    configFields: [{ key: "status", label: "Set status to", type: "select", options: LEAD_STATUS_OPTIONS }],
  },
  { key: "create_lead", label: "Create Lead", description: "Add a new lead.", group: "CRM", icon: UserPlus, live: false },
  { key: "assign_lead", label: "Assign Lead", description: "Assign a lead to a member.", group: "CRM", icon: Users, live: false },
  { key: "archive_lead", label: "Archive Lead", description: "Archive a lead.", group: "CRM", icon: Archive, live: false },

  // Projects
  {
    key: "create_project",
    label: "Create Project",
    description: "Spin up a project from the lead.",
    group: "Projects",
    icon: FolderPlus,
    live: true,
    configFields: [
      { key: "project_name", label: "Project name", type: "text", placeholder: "Defaults to company name", optional: true },
    ],
  },
  {
    key: "create_task",
    label: "Create Task",
    description: "Create a follow-up task.",
    group: "Projects",
    icon: CheckSquare,
    live: true,
    configFields: [
      { key: "title", label: "Task title", type: "text", placeholder: "e.g. Follow up with client" },
      { key: "due_in_days", label: "Due in (days)", type: "number", placeholder: "3", optional: true },
      { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, optional: true },
    ],
  },
  { key: "assign_team", label: "Assign Team", description: "Assign team members to a project.", group: "Projects", icon: Users, live: false },
  { key: "create_milestone", label: "Create Milestone", description: "Add a project milestone.", group: "Projects", icon: Flag, live: false },
  { key: "add_comment", label: "Add Comment", description: "Post a comment or note.", group: "Projects", icon: MessageSquare, live: false },

  // Finance
  { key: "create_invoice", label: "Generate Invoice", description: "Create a draft invoice.", group: "Finance", icon: ReceiptText, live: true },
  { key: "create_expense", label: "Create Expense", description: "Record an expense.", group: "Finance", icon: Wallet, live: false },
  { key: "update_revenue", label: "Update Revenue", description: "Recalculate revenue.", group: "Finance", icon: BarChart3, live: false },
  { key: "create_payment_link", label: "Create Payment Link", description: "Generate a payment link.", group: "Finance", icon: CreditCard, live: false },

  // Communication
  {
    key: "send_email",
    label: "Email",
    description: "Send an email notification.",
    group: "Communication",
    icon: Mail,
    live: true,
    configFields: [
      { key: "subject", label: "Subject", type: "text", placeholder: "Email subject", optional: true },
      { key: "body", label: "Message", type: "textarea", placeholder: "Email body", optional: true },
    ],
  },
  { key: "send_whatsapp", label: "WhatsApp", description: "Send a WhatsApp message.", group: "Communication", icon: MessageCircle, live: false },
  { key: "send_slack", label: "Slack", description: "Post to a Slack channel.", group: "Communication", icon: Slack, live: false },
  { key: "send_sms", label: "SMS", description: "Send a text message.", group: "Communication", icon: Smartphone, live: false },
  { key: "send_notification", label: "Push Notification", description: "Send an in-app notification.", group: "Communication", icon: Bell, live: false },

  // AI
  { key: "generate_proposal", label: "Generate Proposal", description: "Draft a proposal with AI.", group: "AI", icon: FileSignature, live: false },
  { key: "generate_scope", label: "Generate Scope", description: "Draft a project scope with AI.", group: "AI", icon: ScrollText, live: false },
  { key: "summarize_meeting", label: "Summarize Meeting", description: "Summarize meeting notes.", group: "AI", icon: FileText, live: false },
  { key: "draft_email", label: "Draft Email", description: "Draft an email with AI.", group: "AI", icon: Sparkles, live: false },
  { key: "estimate_timeline", label: "Estimate Timeline", description: "Predict a delivery timeline.", group: "AI", icon: CalendarClock, live: false },

  // System
  {
    key: "log_activity",
    label: "Log Activity",
    description: "Write an entry to the activity log.",
    group: "System",
    icon: ScrollText,
    live: true,
    configFields: [{ key: "message", label: "Log message", type: "text", placeholder: "e.g. Workflow ran" }],
  },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "contains", label: "contains" },
];

export const CONDITION_FIELDS: { value: string; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "budget", label: "Budget" },
  { value: "deal_value_cents", label: "Deal value" },
  { value: "source", label: "Lead source" },
  { value: "country", label: "Country" },
  { value: "amount_cents", label: "Amount" },
  { value: "priority", label: "Priority" },
];

export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: "lead-won-project",
    name: "Lead Won → Create Project",
    description: "Automatically spin up a project when a lead is won.",
    category: "sales",
    icon: Handshake,
    popular: true,
    trigger_type: "lead_status_change",
    trigger_config: { to_status: "won" },
    actions: [
      { step_order: 0, action_type: "create_project", action_config: {} },
      { step_order: 1, action_type: "create_task", action_config: { title: "Kickoff call with client", due_in_days: 2, priority: "high" } },
    ],
  },
  {
    id: "proposal-accepted-invoice",
    name: "Proposal Accepted → Generate Invoice",
    description: "Create a draft invoice the moment a proposal is accepted.",
    category: "finance",
    icon: FileCheck,
    popular: true,
    trigger_type: "proposal_accepted",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "create_invoice", action_config: {} }],
  },
  {
    id: "invoice-paid-active",
    name: "Invoice Paid → Mark Project Active",
    description: "Log the payment and keep delivery moving when cash lands.",
    category: "finance",
    icon: BadgeIndianRupee,
    popular: true,
    trigger_type: "invoice_paid",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "log_activity", action_config: { message: "Payment received — project marked active" } }],
  },
  {
    id: "task-overdue-notify",
    name: "Task Overdue → Notify Manager",
    description: "Email the manager when a task slips past its due date.",
    category: "projects",
    icon: CalendarClock,
    trigger_type: "deadline_missed",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "send_email", action_config: { subject: "Task overdue", body: "A task has missed its deadline." } }],
  },
  {
    id: "new-client-welcome",
    name: "New Client → Welcome Email",
    description: "Send a warm welcome email to every new client.",
    category: "sales",
    icon: Mail,
    trigger_type: "client_created",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "send_email", action_config: { subject: "Welcome to Curvvtech", body: "We're excited to work with you!" } }],
  },
  {
    id: "payment-due-reminder",
    name: "Payment Due → Reminder",
    description: "Nudge clients before an invoice becomes overdue.",
    category: "finance",
    icon: Clock,
    trigger_type: "payment_due",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "send_email", action_config: { subject: "Payment reminder", body: "Your invoice is due soon." } }],
  },
  {
    id: "project-completed-testimonial",
    name: "Project Completed → Request Testimonial",
    description: "Ask happy clients for a testimonial on delivery.",
    category: "projects",
    icon: Gift,
    trigger_type: "project_completed",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "send_email", action_config: { subject: "How did we do?", body: "We'd love your feedback!" } }],
  },
  {
    id: "monthly-revenue-report",
    name: "Monthly Revenue Report",
    description: "Generate and share a revenue summary every month.",
    category: "finance",
    icon: BarChart3,
    trigger_type: "schedule_monthly",
    trigger_config: {},
    actions: [{ step_order: 0, action_type: "log_activity", action_config: { message: "Monthly revenue report generated" } }],
  },
];

export function getTrigger(key: string): TriggerDef | undefined {
  return TRIGGERS.find((t) => t.key === key);
}

export function getAction(key: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.key === key);
}

export function triggerIcon(key: string): LucideIcon {
  return getTrigger(key)?.icon ?? Sparkles;
}

export function actionIcon(key: string): LucideIcon {
  return getAction(key)?.icon ?? Sparkles;
}
