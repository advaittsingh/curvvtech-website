import { FolderPlus, Sparkles, Upload, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileSummary } from "../file-schemas";
import { formatStorage } from "../file-schemas";

type Props = {
  summary: FileSummary | null | undefined;
  onUpload: () => void;
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onOrganize: () => void;
  organizing?: boolean;
};

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "primary" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm min-w-[110px]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold mt-0.5 tabular-nums", accent === "primary" && "text-primary", accent === "success" && "text-emerald-700")}>
        {value}
      </p>
    </div>
  );
}

export function FileCommandHeader({
  summary,
  onUpload,
  onCreateFolder,
  onCreateDocument,
  onOrganize,
  organizing,
}: Props) {
  const s = summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Knowledge base</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Files & Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agency document center — proposals, contracts, design assets, and client files.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onOrganize} disabled={organizing}>
            <Sparkles className="h-3.5 w-3.5" />
            {organizing ? "Organizing…" : "Organize files"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateDocument}>
            <FilePlus2 className="h-3.5 w-3.5" />
            Create document
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateFolder}>
            <FolderPlus className="h-3.5 w-3.5" />
            Create folder
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onUpload}>
            <Upload className="h-3.5 w-3.5" />
            Upload files
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricPill label="Total files" value={s?.total ?? "—"} accent="primary" />
        <MetricPill label="Storage used" value={formatStorage(s?.storage_bytes)} />
        <MetricPill label="Recent uploads" value={s?.recent_uploads ?? "—"} accent="success" />
        <MetricPill label="Folders" value={s?.folders ?? "—"} />
      </div>
    </div>
  );
}
