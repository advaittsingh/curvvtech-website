export type InboxFilter =
  | "all"
  | "unread"
  | "assigned"
  | "waiting"
  | "ai_active"
  | "website"
  | "portal"
  | "closed"
  | "high";

export type ConversationPriority = "low" | "normal" | "high" | "urgent";

export type InternalNote = {
  id: string;
  author: string;
  author_name?: string;
  text: string;
  at: string;
};

export type ConversationMetadata = {
  tags?: string[];
  priority?: ConversationPriority | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  notes?: InternalNote[];
  lead_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  admin_last_read_at?: string;
  [key: string]: unknown;
};

export type ChatLead = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  business?: string | null;
  project_type?: string | null;
  budget?: string | null;
  timeline?: string | null;
};

export type ConversationSummary = {
  gist?: string;
  lead_type?: string;
  business?: string;
  budget?: string;
  timeline?: string;
  interest_level?: string;
  extracted_contact?: { email?: string; phone?: string; name?: string };
};

export type InboxMessage = {
  id: string;
  conversation_id: string;
  sender: "user" | "ai" | "agent" | "client";
  message: string;
  agent_clerk_id?: string | null;
  createdAt?: string;
};

export type InboxConversation = {
  id: string;
  visitor_id: string;
  status: string;
  source: string;
  agent_clerk_id?: string | null;
  ip_address?: string | null;
  country?: string | null;
  pages_visited?: string[];
  metadata?: ConversationMetadata;
  started_at?: string;
  ended_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
  last_message?: string | null;
  last_message_at?: string | null;
  last_sender?: string | null;
  message_count?: number;
  unread_count?: number;
  lead_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  client_company?: string | null;
  client_user_name?: string | null;
  project_name?: string | null;
  client_id?: string | null;
  gist?: string | null;
  messages?: InboxMessage[];
  summary?: ConversationSummary | null;
  lead?: ChatLead | null;
  client?: PortalClient | null;
  participant?: Participant | null;
  project?: ConversationProject | null;
};

export type ParticipantType = "client" | "lead" | "guest";

export type Participant = {
  type: ParticipantType;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  since: string | null;
};

export type ConversationProject = {
  id: string;
  name: string;
  progress_pct: number;
  current_phase: string | null;
  target_end_date: string | null;
  status: string;
  health: "on_track" | "watch" | "at_risk" | "done";
  open_tasks: number;
  pending_approvals: number;
  outstanding_cents: number;
};

export type PortalClient = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  gst_number?: string | null;
  address?: string | null;
  status?: string | null;
};

export type TeamMember = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};
