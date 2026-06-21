export type ClientSummary = {
  lifetime_revenue_cents: number;
  outstanding_cents: number;
  total_billed_cents: number;
  total_received_cents: number;
  invoices_pending: number;
  projects_active: number;
  projects_completed: number;
  last_interaction_at?: string | null;
  health_score: number;
};

export type Client = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  website?: string | null;
  gst_number?: string | null;
  address?: string | null;
  contract_value_cents?: number | null;
  status?: string | null;
  notes?: string | null;
  account_manager_id?: string | null;
  account_manager_email?: string | null;
  source_lead_id?: string | null;
  source_lead_name?: string | null;
  portal_status?: string | null;
  portal_last_login_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ClientProject = {
  id: string;
  name?: string;
  status?: string;
  progress_pct?: number;
  budget_cents?: number | null;
  target_end_date?: string | null;
  manager_email?: string | null;
};

export type ClientInvoice = {
  id: string;
  invoice_number?: string;
  status?: string;
  total_cents?: number;
  due_at?: string | null;
  paid_at?: string | null;
};

export type ClientPayment = {
  id: string;
  invoice_number?: string;
  amount_cents?: number;
  paid_at?: string | null;
  provider?: string;
  status?: string;
};

export type ClientNote = {
  id: string;
  body?: string;
  author_email?: string | null;
  author_user_id?: string | null;
  createdAt?: string;
};

export type ClientCommunication = {
  id: string;
  channel?: string;
  subject?: string;
  body?: string;
  author_email?: string | null;
  createdAt?: string;
};

export type ClientTimelineEvent = {
  id: string;
  type: string;
  message?: string;
  created_at?: string;
};

export type ClientAiSummary = {
  summary?: string;
  health_score?: number;
  outstanding_cents?: number;
  active_projects?: number;
  pending_invoices?: number;
  days_since_contact?: number | null;
};
