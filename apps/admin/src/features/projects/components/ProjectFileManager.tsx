import { useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Folder, Upload, Eye, EyeOff } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ProjectFolder } from "../project-schemas";
import { ProjectDeliverableUrls } from "./ProjectDeliverableUrls";

const FOLDER_EMOJI: Record<string, string> = {
  contracts: "📄", designs: "🎨", assets: "🖼️", source: "💻", deliverables: "📦",
  recordings: "🎬", meetings: "📋", invoices: "🧾",
};

/** Folders whose uploads are auto-published to the client portal (matches API). */
const CLIENT_FOLDERS = new Set(["deliverables", "contracts", "designs", "assets"]);

type FileRow = {
  id: string;
  name: string;
  mime_type?: string;
  content_type?: string;
  folder_id?: string;
  visibility?: string | null;
};

type Props = { projectId: string };

export function ProjectFileManager({ projectId }: Props) {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const { data: folders } = useQuery({
    queryKey: ["admin", "projects", projectId, "folders"],
    queryFn: () => api.projects.folders(projectId) as Promise<ProjectFolder[]>,
    enabled: Boolean(projectId),
  });

  const { data: files } = useQuery({
    queryKey: ["admin", "files", projectId, activeFolder],
    queryFn: () => api.files.list({ project_id: projectId, folder_id: activeFolder ?? undefined }),
    enabled: Boolean(projectId),
  });

  const folderList = Array.isArray(folders) ? folders : [];
  const fileList = (Array.isArray(files) ? files : []) as FileRow[];

  const activeFolderMeta = folderList.find((f) => f.id === activeFolder);
  const activeName = activeFolderMeta?.name ?? "All files";
  const autoPublishActive = CLIENT_FOLDERS.has(activeFolderMeta?.folder_kind ?? "");

  const displayFiles = useMemo(() => {
    if (!activeFolder) return fileList;
    return fileList.filter((f) => f.folder_id === activeFolder);
  }, [fileList, activeFolder]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const res = await api.files.uploadUrl({
          name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          project_id: projectId,
          folder_id: activeFolder ?? undefined,
          // Deliverables / Assets / etc. are auto-published server-side; explicit
          // flag covers folders like Source that need a manual share.
          visibility: autoPublishActive ? "client" : undefined,
        });
        if (res.error) throw new Error(res.error);
        const put = await fetch(res.upload.url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!put.ok) {
          if (res.file?.id) await api.files.remove(res.file.id).catch(() => {});
          throw new Error(`Storage upload failed (${put.status})`);
        }
      } catch (e) {
        toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ["admin", "files", projectId] });
    qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "folders"] });
    toast({
      title: "Upload complete",
      description: autoPublishActive ? "Visible in the client portal immediately." : undefined,
    });
  }

  async function download(fileId: string) {
    const res = await api.files.downloadUrl(fileId);
    if (res.url) window.open(res.url, "_blank");
  }

  async function toggleShare(file: FileRow) {
    setSharing(file.id);
    try {
      const next = file.visibility === "client" ? "internal" : "client";
      await api.files.update(file.id, { visibility: next });
      qc.invalidateQueries({ queryKey: ["admin", "files", projectId] });
      toast({
        title: next === "client" ? "Shared with client" : "Hidden from client",
        description: next === "client" ? "Appears in the client portal now." : "Removed from client portal.",
      });
    } catch (e) {
      toast({ title: "Could not update visibility", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSharing(null);
    }
  }

  function isPreviewable(name: string, mime?: string) {
    const n = name.toLowerCase();
    return mime?.startsWith("image/") || n.endsWith(".pdf") || n.endsWith(".fig");
  }

  return (
    <div className="grid lg:grid-cols-[200px_1fr] gap-4 min-h-[320px]">
      <div className="space-y-1">
        <button type="button" onClick={() => setActiveFolder(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${!activeFolder ? "bg-primary/10 font-medium" : "hover:bg-muted/60"}`}>
          <Folder className="h-4 w-4" /> All files
        </button>
        {folderList.map((f) => (
          <button key={f.id} type="button" onClick={() => setActiveFolder(f.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 ${activeFolder === f.id ? "bg-primary/10 font-medium" : "hover:bg-muted/60"}`}>
            <span className="flex items-center gap-2 truncate">
              <span>{FOLDER_EMOJI[f.folder_kind ?? ""] ?? "📁"}</span>
              {f.name}
            </span>
            <span className="text-[10px] text-muted-foreground">{f.file_count ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {activeFolderMeta?.folder_kind === "deliverables" && (
          <ProjectDeliverableUrls projectId={projectId} />
        )}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div>
            <h4 className="font-semibold text-sm">{activeName}</h4>
            {autoPublishActive && (
              <p className="text-[10px] text-primary mt-0.5">Uploads are shared with the client portal automatically</p>
            )}
          </div>
          <Button size="sm" className="gap-1 h-8 shrink-0" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>

        {displayFiles.length === 0 ? (
          <div
            className="border-2 border-dashed border-border rounded-lg py-12 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Drag & drop files here — PDF, images, Figma, ZIP
            {autoPublishActive && <p className="text-[10px] text-primary mt-2">Client will see these in their portal</p>}
          </div>
        ) : (
          <ul className="space-y-2">
            {displayFiles.map((f) => {
              const shared = f.visibility === "client";
              return (
                <li key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{f.name}</p>
                      {shared ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Client</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Internal</span>
                      )}
                    </div>
                    {isPreviewable(f.name, f.mime_type ?? f.content_type) && (
                      <p className="text-[10px] text-primary">Preview available</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={shared ? "Hide from client portal" : "Share with client portal"}
                      disabled={sharing === f.id}
                      onClick={() => toggleShare(f)}
                    >
                      {shared ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => download(f.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
