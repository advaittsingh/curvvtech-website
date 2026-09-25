import type { InboxFilter } from "./inbox.types";

export const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "assigned", label: "Assigned to Me" },
  { id: "waiting", label: "Waiting for Human" },
  { id: "ai_active", label: "AI Active" },
  { id: "website", label: "Website" },
  { id: "portal", label: "Client Portal" },
  { id: "closed", label: "Closed" },
  { id: "high", label: "High Priority" },
];

export const CONVERSATION_TAGS = [
  "Sales",
  "Support",
  "Billing",
  "Bug",
  "Feature Request",
  "VIP",
  "Hot Lead",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  web: "Website",
  website: "Website",
  portal: "Client Portal",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  email: "Email",
};

export const CANNED_REPLIES = [
  "Hello! Thanks for reaching out. How can I help you today?",
  "I'd be happy to help. Could you share a bit more about your project?",
  "Our team will review this and get back to you shortly.",
  "Would you like us to prepare a proposal for you?",
  "Thanks for your patience — I'm looking into this now.",
];

export const FAQ_SUGGESTIONS = ["Pricing", "Timeline", "Portfolio", "Payment terms", "Support hours"];
