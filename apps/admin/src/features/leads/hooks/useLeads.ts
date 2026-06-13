import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { LeadFormValues } from "../schemas";

export function useLeads(status?: string) {
  const api = useAdminApi();
  return useQuery({
    queryKey: ["admin", "leads", status],
    queryFn: () => api.leads.list(status),
  });
}

export function useLeadMutations() {
  const api = useAdminApi();
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "leads"] });

  const create = useMutation({
    mutationFn: (body: LeadFormValues) => api.leads.create(body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.leads.update(id, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.leads.update(id, { status: "closed" }),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
