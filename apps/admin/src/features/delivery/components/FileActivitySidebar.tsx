import { formatDistanceToNow, parseISO } from "date-fns";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileActivityEvent, FileSummary } from "../file-schemas";
import { describeFileActivity } from "../file-schemas";

type Props = {
  activity: FileActivityEvent[];
  recentFiles: { id: string; name: string; updatedAt?: string }[];
  summary: FileSummary | null | undefined;
  onRecentClick: (id: string) => void;
  onOrganize: () => void;
  organizing?: boolean;
};

export function FileActivitySidebar({
  activity,
  recentFiles,
  summary,
  onRecentClick,
  onOrganize,
  organizing,
}: Props) {
  const tips: string[] = [];
  if ((summary?.total ?? 0) === 0) {
    tips.push("Upload proposals and contracts to build your agency knowledge base.");
    tips.push("Link files to projects for client-specific document hubs.");
  } else if ((summary?.recent_uploads ?? 0) > 5) {
    tips.push(`${summary?.recent_uploads} uploads this week — run Organize to sort by project.`);
  } else {
    tips.push("Use smart folders to filter invoices, proposals, and brand assets.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Recent files</h3>
        <ul className="mt-3 space-y-2">
          {recentFiles.length === 0 ? (
            <li className="text-sm text-muted-foreground">No uploads yet.</li>
          ) : (
            recentFiles.slice(0, 6).map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onRecentClick(f.id)}
                  className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {f.updatedAt ? formatDistanceToNow(parseISO(f.updatedAt), { addSuffix: true }) : "—"}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">File activity</h3>
        <ul className="mt-3 space-y-3 max-h-[240px] overflow-y-auto">
          {activity.length === 0 ? (
            <li className="text-sm text-muted-foreground">No activity yet.</li>
          ) : (
            activity.slice(0, 10).map((ev) => (
              <li key={ev.id} className="text-sm border-l-2 border-primary/30 pl-3">
                <p className="leading-snug">{describeFileActivity(ev)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(parseISO(ev.created_at), { addSuffix: true })}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-violet-950">AI organization</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {tips.map((t, i) => (
            <li key={i} className={cn("text-xs text-violet-900/90 leading-relaxed")}>
              • {t}
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          className="w-full mt-3 gap-1.5 bg-violet-600 hover:bg-violet-700"
          onClick={onOrganize}
          disabled={organizing}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Organize files
        </Button>
      </div>
    </div>
  );
}

export function FilePreviewActions({
  onDownload,
  onDelete,
}: {
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button size="sm" className="gap-1.5 flex-1" onClick={onDownload}>
        <Download className="h-3.5 w-3.5" />
        Download
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
