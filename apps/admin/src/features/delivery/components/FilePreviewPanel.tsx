import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { FileRecord, FileVersion } from "../file-schemas";
import { fileIcon, formatBytes, formatFileAge, uploaderLabel } from "../file-schemas";
import { FilePreviewActions } from "./FileActivitySidebar";

type Props = {
  file: FileRecord | null;
  versions: FileVersion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
};

function previewKind(file: FileRecord): "image" | "pdf" | "none" {
  const type = file.content_type ?? "";
  const name = file.name.toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "image";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  return "none";
}

export function FilePreviewPanel({ file, versions, open, onOpenChange, onDownload, onDelete }: Props) {
  const api = useAdminApi();
  const [mediaError, setMediaError] = useState(false);

  const kind = file ? previewKind(file) : "none";

  useEffect(() => {
    setMediaError(false);
  }, [file?.id]);

  const { data: previewData, isLoading: previewLoading, isError: previewQueryError } = useQuery({
    queryKey: ["admin", "files", file?.id, "preview-url"],
    queryFn: async () => {
      const res = (await api.files.downloadUrl(file!.id, { inline: true })) as {
        url?: string;
        error?: string;
        message?: string;
      };
      if (!res?.url) {
        throw new Error(res?.message ?? res?.error ?? "Preview unavailable");
      }
      return res;
    },
    enabled: Boolean(open && file?.id && kind !== "none"),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (!file) return null;

  const previewUrl = previewData?.url;
  const showUnavailable =
    kind === "none" ||
    previewQueryError ||
    mediaError ||
    (!previewLoading && !previewUrl);
  const currentVersion = Number(file.version ?? 1);
  const previous = versions.filter((v) => v.version < currentVersion);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setMediaError(false);
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <span>{fileIcon(file.name, file.content_type)}</span>
            <span className="truncate">{file.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {kind === "image" && previewUrl && !mediaError ? (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-[420px] w-full object-contain"
                onError={() => setMediaError(true)}
              />
            </div>
          ) : kind === "pdf" && previewUrl && !mediaError ? (
            <iframe
              src={previewUrl}
              title={file.name}
              className="w-full h-[480px] rounded-xl border border-border bg-white"
              onError={() => setMediaError(true)}
            />
          ) : kind !== "none" && previewLoading ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 aspect-video flex items-center justify-center text-muted-foreground text-sm">
              Loading preview…
            </div>
          ) : showUnavailable ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 aspect-video flex flex-col items-center justify-center gap-1 px-4 text-center text-muted-foreground text-sm">
              <span>Preview unavailable</span>
              <span className="text-xs">
                {previewQueryError
                  ? "File is missing from storage — re-upload to restore it."
                  : "Download to view this file."}
              </span>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd className="font-medium">{formatBytes(file.size_bytes)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="font-medium truncate">{file.content_type ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Uploaded by</dt>
              <dd className="font-medium">{uploaderLabel(file.uploader_name, file.uploader_email)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated</dt>
              <dd className="font-medium">{formatFileAge(file.updatedAt ?? file.createdAt)}</dd>
            </div>
            {file.project_name && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="font-medium">{file.project_name}</dd>
              </div>
            )}
            {file.client_name && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Client</dt>
                <dd className="font-medium">{file.client_name}</dd>
              </div>
            )}
            {file.folder_name && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Folder</dt>
                <dd className="font-medium">{file.folder_name}</dd>
              </div>
            )}
          </dl>

          <FilePreviewActions
            onDownload={() => onDownload(file.id)}
            onDelete={() => onDelete(file.id)}
          />

          <Separator />

          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Version history</h4>
              <Badge variant="secondary">Current v{currentVersion}</Badge>
            </div>
            {previous.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">No previous versions.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                <li className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Previous versions</li>
                {previous.map((v) => (
                  <li key={v.id} className="flex justify-between text-sm border-b border-border pb-2">
                    <span>Version {v.version}</span>
                    <span className="text-muted-foreground text-xs">
                      {v.createdAt ? format(parseISO(v.createdAt), "MMM d, yyyy") : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
