import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, RotateCcw } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ProjectDeploymentConfig, ProjectDeploymentHistory } from "../project-schemas";
import { formatShortDate } from "../project-schemas";

type Props = { projectId: string };

export function ProjectDeploymentPanel({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Partial<ProjectDeploymentConfig>>({});
  const [deployVersion, setDeployVersion] = useState("");
  const [deployEnv, setDeployEnv] = useState("production");

  const { data } = useQuery({
    queryKey: ["admin", "projects", projectId, "deployment"],
    queryFn: () => api.projects.deployment(projectId) as Promise<{ config: ProjectDeploymentConfig; history: ProjectDeploymentHistory[] }>,
  });

  const config = data?.config;
  const history = Array.isArray(data?.history) ? data.history : [];

  useEffect(() => {
    if (config) setDraft(config);
  }, [config?.id]);

  const save = useMutation({
    mutationFn: () => api.projects.updateDeployment(projectId, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "deployment"] });
      toast({ title: "Deployment config saved" });
    },
  });

  const deploy = useMutation({
    mutationFn: () => api.projects.deploy(projectId, { environment: deployEnv, version: deployVersion || `v${Date.now()}` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "deployment"] });
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "feed"] });
      setDeployVersion("");
      toast({ title: "Deployment recorded" });
    },
  });

  const rollback = useMutation({
    mutationFn: (historyId: string) => api.projects.rollbackDeploy(projectId, { history_id: historyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "deployment"] });
      toast({ title: "Rollback recorded" });
    },
  });

  const fields: { key: keyof ProjectDeploymentConfig; label: string; placeholder?: string }[] = [
    { key: "hosting", label: "Hosting", placeholder: "Vercel / AWS / DigitalOcean" },
    { key: "server", label: "Server", placeholder: "EC2 / VPS IP" },
    { key: "domain", label: "Domain" },
    { key: "github_repo", label: "GitHub", placeholder: "org/repo" },
    { key: "github_branch", label: "Branch", placeholder: "main" },
    { key: "production_url", label: "Production URL" },
    { key: "staging_url", label: "Staging URL" },
    { key: "ssl_status", label: "SSL" },
    { key: "database_info", label: "Database" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              className="mt-1 h-9 text-sm"
              placeholder={f.placeholder}
              value={String(draft[f.key] ?? "")}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-xs text-muted-foreground">Environment variables / API keys (notes)</Label>
          <Textarea className="mt-1 text-sm" rows={3} placeholder="Env vars, API keys — store securely in production"
            value={draft.env_notes ?? ""} onChange={(e) => setDraft({ ...draft, env_notes: e.target.value })} />
        </div>
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save deployment config</Button>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Rocket className="h-4 w-4" /> Deploy</h4>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Version tag" value={deployVersion} onChange={(e) => setDeployVersion(e.target.value)} className="h-9 max-w-[140px]" />
          <select value={deployEnv} onChange={(e) => setDeployEnv(e.target.value)} className="h-9 rounded-md border border-input px-2 text-sm bg-background">
            <option value="production">Production</option>
            <option value="staging">Staging</option>
          </select>
          <Button size="sm" className="h-9" onClick={() => deploy.mutate()} disabled={deploy.isPending}>Record deployment</Button>
        </div>
        {config?.last_deployed_at && (
          <p className="text-xs text-muted-foreground mt-2">Last: {formatShortDate(config.last_deployed_at)} by {config.last_deployed_by ?? "team"}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">Rollback history</h4>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No deployments logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0">
                <div>
                  <span className="font-medium">{h.environment}</span>
                  <span className="text-muted-foreground"> · {h.version ?? "—"} · {h.deployed_at ? formatShortDate(h.deployed_at) : ""}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">{h.status}</Badge>
                </div>
                {h.status === "success" && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => rollback.mutate(h.id)}>
                    <RotateCcw className="h-3 w-3" /> Rollback
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
