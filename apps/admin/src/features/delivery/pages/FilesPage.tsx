import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { BackendErrorAlert } from "@/components/BackendErrorAlert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileCommandHeader } from "../components/FileCommandHeader";
import { FileSmartFolderGrid } from "../components/FileSmartFolderGrid";
import { FileCard } from "../components/FileCard";
import { FileDropZone } from "../components/FileDropZone";
import { FileTypeFilters } from "../components/FileTypeFilters";
import { FileActivitySidebar } from "../components/FileActivitySidebar";
import { FilePreviewPanel } from "../components/FilePreviewPanel";
import {
  SMART_FOLDERS,
  DOC_TEMPLATES,
  filterFiles,
  latestVersionFiles,
  type FileRecord,
  type FileSummary,
  type FileActivityEvent,
  type FolderRecord,
  type FileTypeFilterId,
  type FileVersion,
} from "../file-schemas";

export default function FilesPage() {
  const api = useAdminApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FileTypeFilterId>("all");
  const [smartFolderId, setSmartFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [organizing, setOrganizing] = useState(false);

  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [docTemplate, setDocTemplate] = useState("");
  const [linkProjectId, setLinkProjectId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "files"],
    queryFn: () => api.files.list() as Promise<FileRecord[]>,
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "files", "summary"],
    queryFn: () => api.files.summary() as Promise<FileSummary>,
  });

  const { data: activity } = useQuery({
    queryKey: ["admin", "files", "activity"],
    queryFn: () => api.files.activity(20) as Promise<FileActivityEvent[]>,
  });

  const { data: folders } = useQuery({
    queryKey: ["admin", "files", "folders", currentFolder],
    queryFn: () =>
      api.files.folders(currentFolder ? { parent_id: currentFolder } : undefined) as Promise<FolderRecord[]>,
  });

  const { data: projectsRaw } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => api.projects.list() as Promise<{ id: string; name?: string }[]>,
  });

  const { data: versions } = useQuery({
    queryKey: ["admin", "files", selectedFile?.id, "versions"],
    queryFn: () => api.files.versions(selectedFile!.id) as Promise<FileVersion[]>,
    enabled: Boolean(selectedFile?.id),
  });

  const createFolder = useMutation({
    mutationFn: () =>
      api.files.createFolder({ name: folderName, parent_id: currentFolder ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "files", "folders"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "summary"] });
      setFolderOpen(false);
      setFolderName("");
      toast({ title: "Folder created" });
    },
  });

  const allFiles: FileRecord[] = Array.isArray(data) ? data : [];
  const folderList: FolderRecord[] = Array.isArray(folders) ? folders : [];
  const projects = Array.isArray(projectsRaw) ? projectsRaw : [];

  const displayFiles = useMemo(() => {
    const deduped = latestVersionFiles(allFiles);
    return filterFiles(deduped, {
      search,
      typeFilter,
      smartFolderId,
      folderId: currentFolder,
    });
  }, [allFiles, search, typeFilter, smartFolderId, currentFolder]);

  const recentFiles = useMemo(
    () => [...allFiles].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))).slice(0, 8),
    [allFiles],
  );

  async function handleUpload(file: File) {
    try {
      const res = await api.files.uploadUrl({
        name: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        folder_id: currentFolder ?? undefined,
        project_id: linkProjectId || undefined,
      });
      if (res.error) throw new Error(res.error);
      await fetch(res.upload.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      qc.invalidateQueries({ queryKey: ["admin", "files"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "summary"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "activity"] });
      toast({ title: "File uploaded", description: file.name });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleUploadMany(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      await handleUpload(file);
    }
  }

  async function handleDownload(fileId: string) {
    const res = await api.files.downloadUrl(fileId);
    if (res.url) window.open(res.url, "_blank");
    else toast({ title: "Download unavailable", description: res.error ?? "S3 not configured", variant: "destructive" });
  }

  async function handleDelete(fileId: string) {
    try {
      await api.files.remove(fileId);
      qc.invalidateQueries({ queryKey: ["admin", "files"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "summary"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "activity"] });
      setPreviewOpen(false);
      setSelectedFile(null);
      toast({ title: "File deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleOrganize() {
    setOrganizing(true);
    try {
      const res = (await api.files.organize()) as { moved?: number; details?: string[] };
      qc.invalidateQueries({ queryKey: ["admin", "files"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "folders"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "summary"] });
      qc.invalidateQueries({ queryKey: ["admin", "files", "activity"] });
      toast({
        title: res.moved ? `Organized ${res.moved} files` : "Already organized",
        description: res.details?.slice(0, 3).join(" · ") ?? "No changes needed.",
      });
    } catch (e) {
      toast({ title: "Organize failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setOrganizing(false);
    }
  }

  async function handleCreateDocument() {
    const template = DOC_TEMPLATES.find((t) => t.id === docTemplate);
    if (!template) return;
    try {
      const rootFolders = (await api.files.folders()) as FolderRecord[];
      let folderId = rootFolders.find((f) => f.name === template.folder)?.id;
      if (!folderId) {
        const created = (await api.files.createFolder({ name: template.folder })) as FolderRecord;
        folderId = created.id;
      }
      setCurrentFolder(folderId);
      setFolderStack([{ id: folderId, name: template.folder }]);
      setSmartFolderId(null);
      setDocOpen(false);
      setDocTemplate("");
      toast({
        title: `${template.label} folder ready`,
        description: `Upload your ${template.label.toLowerCase()} files here.`,
      });
      qc.invalidateQueries({ queryKey: ["admin", "files", "folders"] });
    } catch (e) {
      toast({ title: "Could not create document folder", description: (e as Error).message, variant: "destructive" });
    }
  }

  function openFolder(folder: FolderRecord) {
    setFolderStack((s) => [...s, folder]);
    setCurrentFolder(folder.id);
    setSmartFolderId(null);
  }

  function goRoot() {
    setFolderStack([]);
    setCurrentFolder(null);
  }

  function openFile(file: FileRecord) {
    setSelectedFile(file);
    setPreviewOpen(true);
  }

  const showEmpty = !isLoading && displayFiles.length === 0 && folderList.length === 0;

  return (
    <div className="p-6 space-y-5">
      <FileCommandHeader
        summary={summary}
        onUpload={() => fileInput.current?.click()}
        onCreateFolder={() => setFolderOpen(true)}
        onCreateDocument={() => setDocOpen(true)}
        onOrganize={handleOrganize}
        organizing={organizing}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search files, projects, clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <FileTypeFilters value={typeFilter} onChange={setTypeFilter} />

      {!currentFolder && (
        <FileSmartFolderGrid
          folders={SMART_FOLDERS}
          files={allFiles}
          activeId={smartFolderId}
          onSelect={(id) => {
            setSmartFolderId(id);
            if (id) {
              setCurrentFolder(null);
              setFolderStack([]);
            }
          }}
        />
      )}

      {(folderStack.length > 0 || folderList.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={goRoot}>
            All files
          </Button>
          {folderStack.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  setFolderStack(folderStack.slice(0, i + 1));
                  setCurrentFolder(f.id);
                }}
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {folderList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {folderList.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => openFolder(f)}
              className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="text-xl">📁</span>
              <p className="font-medium text-sm mt-1 truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.file_count ?? 0} files</p>
            </button>
          ))}
        </div>
      )}

      <BackendErrorAlert error={error} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="min-w-0 space-y-4">
          {showEmpty ? (
            <FileDropZone
              dragging={dragging}
              onDragState={setDragging}
              onChoose={() => fileInput.current?.click()}
              onFiles={handleUploadMany}
            />
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading files…</p>
          ) : displayFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <p className="text-2xl mb-2">📁</p>
              <p className="font-medium">No files in this view</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload contracts, proposals, design assets, or project documents.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button size="sm" onClick={() => fileInput.current?.click()}>Upload files</Button>
                <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>Create folder</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayFiles.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  selected={selectedFile?.id === f.id}
                  onClick={() => openFile(f)}
                />
              ))}
            </div>
          )}
        </div>

        <FileActivitySidebar
          activity={Array.isArray(activity) ? activity : []}
          recentFiles={recentFiles}
          summary={summary}
          onRecentClick={(id) => {
            const f = allFiles.find((x) => x.id === id);
            if (f) openFile(f);
          }}
          onOrganize={handleOrganize}
          organizing={organizing}
        />
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && handleUploadMany(e.target.files)}
      />

      <FilePreviewPanel
        file={selectedFile}
        versions={Array.isArray(versions) ? versions : []}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create folder</DialogTitle></DialogHeader>
          <Label>Folder name</Label>
          <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. Masako India" />
          <Button className="w-full mt-3" disabled={!folderName} onClick={() => createFolder.mutate()}>
            Create folder
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create document</DialogTitle>
            <DialogDescription>Choose a template — we&apos;ll open the matching folder for uploads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Template</Label>
            <Select value={docTemplate || "none"} onValueChange={(v) => setDocTemplate(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose…</SelectItem>
                {DOC_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Link to project (optional)</Label>
            <Select value={linkProjectId || "none"} onValueChange={(v) => setLinkProjectId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name ?? p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!docTemplate} onClick={handleCreateDocument}>
              Open template folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
