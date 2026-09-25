"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileImage,
  FileArchive,
  FileCode,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Folder,
  ChevronLeft,
  ExternalLink,
  Globe,
} from "lucide-react";
import { api, uploadProjectFile, type UploadFolder } from "@/lib/api";
import { SectionCard, Skeleton, relativeTime, Btn } from "@/components/ui";

export type ProjectFileRow = {
  id: string;
  name: string;
  content_type: string | null;
  size_bytes: number;
  folder_id: string | null;
  folder_name: string | null;
  uploaded_by_client: boolean;
  created_at: string;
};

type WebsiteUrl = { id: string; label: string; url: string };

function fileFolder(ct: string | null): { folder: string; icon: typeof FileText } {
  const t = (ct ?? "").toLowerCase();
  if (t.startsWith("image/")) return { folder: "Designs", icon: FileImage };
  if (t.includes("pdf") || t.includes("word")) return { folder: "Contracts", icon: FileText };
  if (t.includes("zip") || t.includes("apk")) return { folder: "Deliverables", icon: FileArchive };
  if (t.includes("json") || t.includes("text")) return { folder: "Credentials", icon: FileCode };
  return { folder: "Other", icon: FileText };
}

function folderIcon(name: string): typeof FileText {
  const n = name.toLowerCase();
  if (n.includes("design")) return FileImage;
  if (n.includes("deliverable")) return FileArchive;
  if (n.includes("credential") || n.includes("source")) return FileCode;
  if (n.includes("contract") || n.includes("asset")) return FileText;
  return Folder;
}

function humanSize(bytes: number): string {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

const MAX_BYTES = 50 * 1024 * 1024;

type UploadState = { name: string; status: "uploading" | "done" | "error"; error?: string };

type Props = {
  projectId: string;
  /** When true, hides standalone page chrome (used inside project detail tab). */
  embedded?: boolean;
};

export function ProjectFilesPanel({ projectId, embedded = false }: Props) {
  const [files, setFiles] = useState<ProjectFileRow[]>([]);
  const [websiteUrls, setWebsiteUrls] = useState<WebsiteUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFolders, setUploadFolders] = useState<UploadFolder[]>([]);
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragging, setDragging] = useState(false);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refetchFiles = useCallback(async () => {
    const r = await api<{ files: ProjectFileRow[]; website_urls?: WebsiteUrl[] }>(`/projects/${projectId}/files`);
    setFiles(r.files);
    setWebsiteUrls(r.website_urls ?? []);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refetchFiles().finally(() => setLoading(false));
  }, [refetchFiles]);

  useEffect(() => {
    api<{ folders: UploadFolder[] }>(`/projects/${projectId}/folders`)
      .then((r) => {
        setUploadFolders(r.folders);
        setTargetFolder((cur) => cur || r.folders.find((f) => f.kind === "assets")?.id || r.folders[0]?.id || "");
      })
      .catch(() => {});
  }, [projectId]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const chosen = Array.from(fileList);
      for (const file of chosen) {
        if (file.size > MAX_BYTES) {
          setUploads((u) => [{ name: file.name, status: "error", error: "Too large (max 50 MB)" }, ...u]);
          continue;
        }
        setUploads((u) => [{ name: file.name, status: "uploading" }, ...u]);
        try {
          await uploadProjectFile(projectId, file, targetFolder || undefined);
          setUploads((u) => u.map((x) => (x.name === file.name && x.status === "uploading" ? { ...x, status: "done" } : x)));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          setUploads((u) => u.map((x) => (x.name === file.name && x.status === "uploading" ? { ...x, status: "error", error: msg } : x)));
        }
      }
      await refetchFiles();
    },
    [projectId, targetFolder, refetchFiles],
  );

  async function download(id: string) {
    const r = await api<{ url: string }>(`/files/${id}/download-url`);
    window.open(r.url, "_blank");
  }

  if (loading) return <Skeleton className={embedded ? "h-48" : "h-64"} />;

  const folders = files.reduce<Record<string, ProjectFileRow[]>>((acc, f) => {
    const key = f.folder_name ?? fileFolder(f.content_type).folder;
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  const recent = [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const activeFolderName = uploadFolders.find((f) => f.id === targetFolder)?.name;

  const folderNames = Array.from(
    new Set([...uploadFolders.map((f) => f.name), ...Object.keys(folders)]),
  ).sort((a, b) => (folders[b]?.length ?? 0) - (folders[a]?.length ?? 0) || a.localeCompare(b));

  const openItems = openFolder ? (folders[openFolder] ?? []) : [];

  return (
    <div className={embedded ? "cp-animate-in space-y-6" : "cp-animate space-y-6"}>
      {!embedded && (
        <div className="flex justify-end">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <UploadCloud size={16} /> Upload files
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.zip,.apk,.png,.jpg,.jpeg,.webp,.gif,.svg"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {websiteUrls.length > 0 && (
        <SectionCard
          title="Live deliverables"
          icon={Globe}
          action={<span className="text-xs text-[var(--muted)]">{websiteUrls.length} {websiteUrls.length === 1 ? "link" : "links"}</span>}
          bodyClassName="p-0"
        >
          <div className="divide-y divide-[var(--border)]">
            {websiteUrls.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                <div className="h-11 w-11 rounded-xl bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center shrink-0">
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{u.label}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{u.url}</div>
                </div>
                <a href={u.url} target="_blank" rel="noreferrer" className="shrink-0">
                  <Btn variant="outline" size="sm"><ExternalLink size={14} /> Visit</Btn>
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Share files with your team"
        icon={UploadCloud}
        action={
          uploadFolders.length > 0 ? (
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Add to
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-xs font-medium text-[var(--text)]"
              >
                {uploadFolders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/[0.04]" : "border-[var(--border)] hover:border-[var(--brand-accent)]/50"
          }`}
        >
          <UploadCloud size={26} className="mb-2 text-[var(--muted-2)]" />
          <div className="text-sm font-medium">Drag &amp; drop images or files here, or click to browse</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Photos, PDFs, brand assets, references · up to 50 MB each
            {activeFolderName ? <> · goes to <span className="font-medium text-[var(--text)]">{activeFolderName}</span></> : null}
          </div>
        </div>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((u, i) => (
              <div key={`${u.name}-${i}`} className="flex items-center gap-2 text-sm">
                {u.status === "uploading" && <Loader2 size={15} className="animate-spin text-[var(--muted-2)]" />}
                {u.status === "done" && <CheckCircle2 size={15} className="text-emerald-500" />}
                {u.status === "error" && <AlertCircle size={15} className="text-rose-500" />}
                <span className="truncate">{u.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {u.status === "uploading" ? "Uploading…" : u.status === "done" ? "Shared" : u.error}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {openFolder ? (
        <div>
          <button
            onClick={() => setOpenFolder(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ChevronLeft size={16} /> All folders
          </button>
          <SectionCard
            title={openFolder}
            icon={folderIcon(openFolder)}
            action={<span className="text-xs text-[var(--muted)]">{openItems.length} {openItems.length === 1 ? "file" : "files"}</span>}
            bodyClassName="p-0"
          >
            {openItems.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Folder size={26} className="mx-auto mb-2 text-[var(--muted-2)]" />
                <div className="text-sm font-medium">This folder is empty</div>
                <div className="text-xs text-[var(--muted)] mt-1">Drop a file above and choose “{openFolder}” to add it here.</div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {openItems.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        {f.uploaded_by_client && (
                          <span className="shrink-0 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">You</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{humanSize(f.size_bytes)} · {relativeTime(f.created_at)}</div>
                    </div>
                    <button onClick={() => download(f.id)} className="text-sm font-medium text-[var(--brand-accent)] flex items-center gap-1 shrink-0">
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folderNames.map((name) => {
              const FolderIcon = folderIcon(name);
              const count = folders[name]?.length ?? 0;
              return (
                <button
                  key={name}
                  onClick={() => setOpenFolder(name)}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3.5 text-left transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
                >
                  <div className="h-10 w-10 rounded-xl bg-[var(--info-bg)] flex items-center justify-center shrink-0">
                    <FolderIcon size={18} className="text-[var(--info)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{name}</div>
                    <div className="text-xs text-[var(--muted)]">{count} {count === 1 ? "file" : "files"}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {recent.length > 0 ? (
            <SectionCard title="Recently added" bodyClassName="p-0">
              <div className="divide-y divide-[var(--border)]">
                {recent.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        {f.uploaded_by_client && (
                          <span className="shrink-0 rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">You</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{f.folder_name ? `${f.folder_name} · ` : ""}{relativeTime(f.created_at)}</div>
                    </div>
                    <button onClick={() => download(f.id)} className="text-sm font-medium text-[var(--brand-accent)] flex items-center gap-1">
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : folderNames.length === 0 && websiteUrls.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-3">
                <Folder size={22} className="text-[var(--muted-2)]" />
              </div>
              <div className="text-sm font-medium">No files yet</div>
              <div className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Once your team uploads designs, contracts, or deliverables they'll appear in these folders. You can also drop your own images and files above.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
