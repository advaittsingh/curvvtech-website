import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Stats = {
  total_calls: number;
  answered_calls: number;
  meetings_booked: number;
  interested: number;
  callback: number;
  not_interested: number;
  connection_rate: number;
  interest_rate: number;
  booking_rate: number;
};

type LogRow = {
  id: string;
  status: string;
  outcome: string | null;
  created_at: string;
  summary: string | null;
  recording_url: string | null;
  transcript?: string | null;
  lead_id: string;
  lead_name: string | null;
  lead_company: string | null;
  lead_phone: string | null;
  lead_call_status: string | null;
  lead_last_call_at: string | null;
};

export default function AiAgent() {
  const token = getAccessToken();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [limit, setLimit] = useState(50);
  const [leadSource, setLeadSource] = useState<"crm_leads">("crm_leads");
  const [startMode, setStartMode] = useState<"now" | "scheduled">("now");

  const statsQ = useQuery<Stats>({
    queryKey: ["admin", "ai-calls", "stats"],
    queryFn: () => adminApi(token).aiCalls.stats(),
    refetchInterval: 15_000,
  });

  const logsQ = useQuery<{ items: LogRow[]; limit: number; offset: number }>({
    queryKey: ["admin", "ai-calls", "logs"],
    queryFn: () => adminApi(token).aiCalls.logs({ limit: 50, offset: 0 }),
    refetchInterval: 15_000,
  });

  const campaignQ = useQuery<any>({
    queryKey: ["admin", "ai-calls", "campaign-status"],
    queryFn: () => adminApi(token).aiCalls.campaignStatus(),
    refetchInterval: 5_000,
  });

  const liveQ = useQuery<{ items: any[] }>({
    queryKey: ["admin", "ai-calls", "live"],
    queryFn: () => adminApi(token).aiCalls.live(),
    refetchInterval: 5_000,
  });

  const hotQ = useQuery<{ items: LogRow[] }>({
    queryKey: ["admin", "ai-calls", "hot"],
    queryFn: () => adminApi(token).aiCalls.hot(),
    refetchInterval: 15_000,
  });

  const insightsQ = useQuery<any>({
    queryKey: ["admin", "ai-calls", "insights"],
    queryFn: () => adminApi(token).aiCalls.insights(),
    refetchInterval: 30_000,
  });

  const callbacksQ = useQuery<{ items: any[] }>({
    queryKey: ["admin", "ai-calls", "callbacks"],
    queryFn: () => adminApi(token).aiCalls.callbacks(),
    refetchInterval: 15_000,
  });

  const startM = useMutation({
    mutationFn: () => adminApi(token).aiCalls.start({ limit }),
    onSuccess: (data: any) => {
      toast({ title: "Calling started", description: `Queued ${data?.queued ?? 0} lead(s).` });
      void qc.invalidateQueries({ queryKey: ["admin", "ai-calls"] });
    },
    onError: (e: any) => toast({ title: "Failed to start", description: String(e?.message || e), variant: "destructive" }),
  });

  const callNowM = useMutation({
    mutationFn: (id: string) => adminApi(token).aiCalls.callLead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-calls"] }),
  });

  const markBookedM = useMutation({
    mutationFn: (id: string) => adminApi(token).aiCalls.markBooked(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-calls"] }),
  });

  const markDndM = useMutation({
    mutationFn: (id: string) => adminApi(token).aiCalls.markDnd(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-calls"] }),
  });

  const markHotM = useMutation({
    mutationFn: (id: string) => adminApi(token).aiCalls.markHot(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "ai-calls"] }),
  });

  const rates = useMemo(() => {
    const s = statsQ.data;
    if (!s) return null;
    return {
      connection: pct(s.connection_rate),
      interest: pct(s.interest_rate),
      booking: pct(s.booking_rate),
    };
  }, [statsQ.data]);

  return (
    <div className="p-3 lg:p-6 space-y-6">
      <Card className="border border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Campaign control</CardTitle>
            <div className="text-xs text-stone-600">
              Status:{" "}
              <span className={campaignQ.data?.running ? "text-emerald-700 font-semibold" : "text-stone-600"}>
                {campaignQ.data?.running ? "Running" : "Idle"}
              </span>
              {campaignQ.data?.last_campaign?.target ? (
                <span className="ml-2 text-stone-500">
                  ({campaignQ.data.queue?.completed ?? 0}/{campaignQ.data.last_campaign.target} processed)
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <div className="text-xs text-stone-600 mb-1">Lead source</div>
                <Select value={leadSource} onValueChange={(v) => setLeadSource(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crm_leads">CRM leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-stone-600 mb-1">Calls to run</div>
                <input
                  type="number"
                  className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                  value={limit}
                  min={1}
                  max={500}
                  onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <div className="text-xs text-stone-600 mb-1">Timing</div>
                <Select value={startMode} onValueChange={(v) => setStartMode(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Start now</SelectItem>
                    <SelectItem value="scheduled" disabled>
                      Scheduled (soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => startM.mutate()}
              disabled={startM.isPending || leadSource !== "crm_leads" || startMode !== "now"}
              className="h-11 px-6 font-semibold bg-gradient-to-r from-stone-900 to-stone-700 text-white"
            >
              {startM.isPending ? "Starting…" : "Start AI Campaign"}
            </Button>
          </div>
          <div className="text-xs text-stone-500 mt-3">
            Upload leads → Start AI campaign → Watch it generate clients.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total calls" value={statsQ.data?.total_calls ?? 0} loading={statsQ.isLoading} />
        <StatCard title="Answered" value={statsQ.data?.answered_calls ?? 0} loading={statsQ.isLoading} />
        <StatCard title="Interested" value={statsQ.data?.interested ?? 0} loading={statsQ.isLoading} />
        <StatCard title="Booked" value={statsQ.data?.meetings_booked ?? 0} loading={statsQ.isLoading} />
        <StatCard title="Callback" value={statsQ.data?.callback ?? 0} loading={statsQ.isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Connection rate" valueText={statsQ.isLoading ? "—" : rates?.connection ?? "—"} />
        <StatCard title="Interest rate" valueText={statsQ.isLoading ? "—" : rates?.interest ?? "—"} />
        <StatCard title="Booking rate" valueText={statsQ.isLoading ? "—" : rates?.booking ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-stone-200">
          <CardHeader>
            <CardTitle>Live calls</CardTitle>
          </CardHeader>
          <CardContent>
            {(liveQ.data?.items?.length ?? 0) === 0 ? (
              <div className="text-sm text-stone-600">No live calls right now.</div>
            ) : (
              <div className="space-y-2">
                {liveQ.data!.items.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-stone-900 truncate">{r.lead_name || r.lead_phone || "—"}</div>
                      <div className="text-xs text-stone-600 truncate">
                        {r.duration_seconds != null ? `⏱ ${fmtDur(r.duration_seconds)} · ` : ""}
                        {r.status}
                      </div>
                      <div className="text-xs text-stone-600 mt-1 truncate">
                        <span className="font-medium">AI:</span> {r.ai_saying || "—"}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3 animate-pulse">LIVE</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-stone-200">
          <CardHeader>
            <CardTitle>🔥 Hot leads</CardTitle>
          </CardHeader>
          <CardContent>
            {(hotQ.data?.items?.length ?? 0) === 0 ? (
              <div className="text-sm text-stone-600">
                No hot leads yet. Start your first AI campaign to begin generating leads.
              </div>
            ) : (
              <div className="space-y-2">
                {hotQ.data!.items.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-stone-900 truncate">{r.lead_name || "—"}</div>
                      <div className="text-xs text-stone-600 truncate">
                        {r.lead_company ? `${r.lead_company} · ` : ""}
                        {r.lead_phone || "—"}
                      </div>
                      <div className="text-xs text-stone-600 mt-1 truncate">
                        <span className="font-medium">Summary:</span> {r.summary || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-wrap justify-end">
                      <Badge className={outcomeBadgeClass(r.outcome)}>{(r.outcome || "hot").toUpperCase()}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callNowM.mutate(r.lead_id)}
                        disabled={callNowM.isPending}
                      >
                        Call now
                      </Button>
                      <a
                        className="text-sm underline text-stone-900"
                        href={waLink(r.lead_phone, r.lead_name)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markBookedM.mutate(r.lead_id)}
                        disabled={markBookedM.isPending}
                      >
                        Book meeting
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markDndM.mutate(r.lead_id)}
                        disabled={markDndM.isPending}
                      >
                        DND
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-stone-200">
        <CardHeader>
          <CardTitle>🔁 Scheduled callbacks</CardTitle>
        </CardHeader>
        <CardContent>
          {(callbacksQ.data?.items?.length ?? 0) === 0 ? (
            <div className="text-sm text-stone-600">No scheduled callbacks.</div>
          ) : (
            <div className="space-y-2">
              {callbacksQ.data!.items.slice(0, 10).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-stone-900 truncate">{r.name || "—"}</div>
                    <div className="text-xs text-stone-600 truncate">{r.company ? `${r.company} · ` : ""}{r.phone || "—"}</div>
                  </div>
                  <div className="text-xs text-stone-700">
                    {r.next_call_at ? new Date(r.next_call_at).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-stone-200">
        <CardHeader>
          <CardTitle>Recent call logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logsQ.isLoading ? (
            <div className="text-sm text-stone-600">Loading…</div>
          ) : logsQ.isError ? (
            <div className="text-sm text-red-600">Failed to load logs.</div>
          ) : (logsQ.data?.items?.length ?? 0) === 0 ? (
            <div className="text-sm text-stone-600">
              Start your first AI campaign to begin generating leads.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsQ.data!.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-[220px]">
                        <div className="font-medium text-stone-900">{r.lead_name || "—"}</div>
                        <div className="text-xs text-stone-600">
                          {r.lead_company ? `${r.lead_company} · ` : ""}
                          {r.lead_phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.status}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.outcome ? <Badge className={outcomeBadgeClass(r.outcome)}>{r.outcome}</Badge> : <span className="text-stone-400">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-stone-600">
                        {r.duration_seconds != null ? `${r.duration_seconds}s` : "—"}
                      </TableCell>
                      <TableCell className="min-w-[320px] text-sm text-stone-700">
                        {r.summary ? r.summary : <span className="text-stone-400">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-stone-600">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {r.recording_url ? (
                            <a className="text-stone-900 underline" href={r.recording_url} target="_blank" rel="noreferrer">
                              Play
                            </a>
                          ) : (
                            <span className="text-stone-400">No audio</span>
                          )}
                          <TranscriptDialog row={r} />
                          <button className="text-stone-900 underline" onClick={() => markHotM.mutate(r.lead_id)}>
                            Mark hot
                          </button>
                          <button className="text-stone-900 underline" onClick={() => markDndM.mutate(r.lead_id)}>
                            DND
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-stone-200">
        <CardHeader>
          <CardTitle>AI insights (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {insightsQ.isLoading ? (
            <div className="text-sm text-stone-600">Loading…</div>
          ) : insightsQ.isError ? (
            <div className="text-sm text-red-600">Failed to load insights.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-stone-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-stone-600 font-medium">Most common objection</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-stone-800">
                  {formatObjection(insightsQ.data?.common_objections)}
                </CardContent>
              </Card>
              <Card className="border border-stone-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-stone-600 font-medium">Best performing line</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-stone-800">
                  {insightsQ.data?.best_line_hint || "—"}
                </CardContent>
              </Card>
              <Card className="border border-stone-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-stone-600 font-medium">Peak pickup time</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-stone-800">
                  {formatPeak(insightsQ.data?.peak_pickup_hours)}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  valueText,
  loading,
}: {
  title: string;
  value?: number;
  valueText?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-stone-600 font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-stone-900">
          {valueText != null ? valueText : loading ? "—" : value ?? 0}
        </div>
      </CardContent>
    </Card>
  );
}

function pct(x: number) {
  const n = Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
  return `${Math.round(n * 100)}%`;
}

function outcomeBadgeClass(outcome: string | null) {
  const o = (outcome || "").toLowerCase();
  if (o === "booked") return "bg-emerald-600 text-white border-emerald-700";
  if (o === "interested") return "bg-amber-500 text-white border-amber-600";
  if (o === "callback") return "bg-orange-500 text-white border-orange-600";
  if (o === "not_interested") return "bg-stone-700 text-white border-stone-800";
  if (o === "no_answer") return "bg-sky-600 text-white border-sky-700";
  return "bg-stone-200 text-stone-900 border-stone-300";
}

function TranscriptDialog({ row }: { row: LogRow }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-stone-900 underline">Transcript</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transcript</DialogTitle>
          <DialogDescription>
            {row.lead_name || "Lead"} · {new Date(row.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <div className="text-stone-500 mb-1">Summary</div>
            <div className="text-stone-900">{row.summary || "—"}</div>
          </div>
          <div className="text-sm">
            <div className="text-stone-500 mb-1">Transcript</div>
            <pre className="whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 max-h-[50vh] overflow-auto">
              {row.transcript || "—"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatObjection(b: any) {
  if (!b) return "—";
  const entries = Object.entries(b as Record<string, number>).sort((a, b) => (b[1] as number) - (a[1] as number));
  const top = entries[0];
  if (!top) return "—";
  const name =
    top[0] === "already_has"
      ? "“Already have someone/website”"
      : top[0] === "not_needed"
        ? "“Not needed / we're fine”"
        : top[0] === "too_busy"
          ? "“Busy / call later”"
          : top[0] === "price"
            ? "“Price / budget”"
            : "Other";
  return `${name} (${top[1]})`;
}

function formatPeak(xs: any) {
  if (!Array.isArray(xs) || xs.length === 0) return "—";
  const h = xs[0]?.hour;
  if (typeof h !== "number") return "—";
  const from = new Date();
  from.setHours(h, 0, 0, 0);
  return `${from.toLocaleTimeString([], { hour: "numeric" })} (top hour)`;
}

function waLink(phone: string | null, name: string | null) {
  const raw = String(phone || "").replace(/[^\d+]/g, "");
  const e164 = raw.startsWith("+") ? raw.slice(1) : raw;
  const text = name ? `Hi ${name}, sharing details as discussed.` : "Hi, sharing details as discussed.";
  return `https://wa.me/${encodeURIComponent(e164)}?text=${encodeURIComponent(text)}`;
}

function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

