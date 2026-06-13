import { z } from "zod";

export const leadSchema = z.object({
  source: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["new", "contacted", "in_discussion", "proposal_sent", "won", "closed"]).default("new"),
  budget: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export type Lead = {
  id: string;
  source?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
