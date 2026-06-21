import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { LeadFilters, LeadFormValues } from "../schemas";

export function useLeads(filters?: LeadFilters) {
  const api = useAdminApi();
  return useQuery({
    queryKey: ["admin", "leads", filters],
    queryFn: () => api.leads.list(filters),
  });
}

export function usePipelineSummary() {
  const api = useAdminApi();
  return useQuery({
    queryKey: ["admin", "leads", "pipeline-summary"],
    queryFn: async () => {
      const data = await api.leads.pipelineSummary();
      if (data && typeof data === "object" && "error" in data) {
        throw new Error(String((data as { message?: string; error?: string }).message ?? (data as { error?: string }).error));
      }
      return data;
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useLeadMutations() {
  const api = useAdminApi();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "leads"] });
  };

  const create = useMutation({
    mutationFn: (body: LeadFormValues) => api.leads.create(body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.leads.update(id, body),
    onSuccess: (_, { id }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin", "leads", id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.leads.update(id, { status: "lost" }),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
