import { cn } from "@/lib/utils";
import type { FileRecord } from "../file-schemas";
import { fileIcon, formatBytes, formatFileAge, uploaderLabel } from "../file-schemas";

type Props = {
  file: FileRecord;
  selected?: boolean;
  onClick?: () => void;
};

export function FileCard({ file, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md w-full",
        selected ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{fileIcon(file.name, file.content_type)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" title={file.name}>
            {file.name}
          </p>
          {file.project_name && (
            <p className="text-xs text-muted-foreground mt-1 truncate">Project: {file.project_name}</p>
          )}
          {file.client_name && !file.project_name && (
            <p className="text-xs text-muted-foreground mt-1 truncate">Client: {file.client_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[10px] text-muted-foreground">
            <span>{uploaderLabel(file.uploader_name, file.uploader_email)}</span>
            <span>·</span>
            <span>{formatBytes(file.size_bytes)}</span>
            {(file.version ?? 1) > 1 && (
              <>
                <span>·</span>
                <span className="text-violet-600 font-medium">v{file.version}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{formatFileAge(file.updatedAt ?? file.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}
