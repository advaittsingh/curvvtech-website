import { z } from "zod";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "./constants";

export { LEAD_STATUSES, LEAD_SOURCES, LEAD_PRIORITIES };

export const quickLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export type QuickLeadFormValues = z.infer<typeof quickLeadSchema>;

export const leadSchema = z.object({
  source: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
  requirements: z.string().optional(),
  status: z.enum(LEAD_STATUSES).default("new"),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  expected_close_date: z.string().optional(),
  deal_value_cents: z.number().optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  project_type: z.string().optional(),
  assigned_to_clerk_id: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export type LeadFilters = {
  status?: string;
  assigned_to?: string;
  priority?: string;
  source?: string;
  project_type?: string;
  budget_min?: number;
  budget_max?: number;
};

export type PipelineSummary = {
  total_leads: number;
  pipeline_value_cents: number;
  won_this_month_cents: number;
  conversion_rate_pct: number;
};

export type LeadAiInsights = {
  score: number;
  tier: "hot" | "warm" | "cold";
  probability: number;
  insights: string[];
  recommended_actions: { label: string; href: string; kind: string }[];
};

export type Lead = {
  id: string;
  source?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  requirements?: string | null;
  status?: string | null;
  budget?: string | null;
  timeline?: string | null;
  expected_close_date?: string | null;
  deal_value_cents?: number | null;
  priority?: string | null;
  project_type?: string | null;
  assigned_to_clerk_id?: string | null;
  tags?: string[] | null;
  score?: number | null;
  probability?: number | null;
  next_follow_up_at?: string | null;
  last_contacted_at?: string | null;
  converted_client_id?: string | null;
  converted_project_id?: string | null;
  converted_proposal_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
