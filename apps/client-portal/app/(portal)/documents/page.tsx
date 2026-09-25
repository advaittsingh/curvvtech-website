"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Download, FileText, FileImage, FileArchive, FileCode, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import {
  PageHeader,
  SectionCard,
  Empty,
  Skeleton,
  relativeTime,
  Breadcrumbs,
} from "@/components/ui";

type FileRow = { id: string; name: string; content_type: string | null; size_bytes: number; created_at: string; project_id: string | null };

function classify(name: string, ct: string | null): { folder: string; icon: typeof FileText } {
  const n = name.toLowerCase();
  const t = (ct ?? "").toLowerCase();
  if (n.includes("invoice") || n.includes("receipt") || n.includes("gst")) return { folder: "Billing", icon: Receipt };
  if (n.includes("proposal") || n.includes("agreement") || n.includes("contract") || n.includes("sow"))
    return { folder: "Contracts", icon: FileText };
  if (t.startsWith("image/") || n.includes("figma") || n.includes("mockup") || n.includes("design") || n.includes("logo"))
    return { folder: "Designs", icon: FileImage };
  if (t.includes("zip") || t.includes("apk") || n.includes("deliverable") || n.includes("build"))
    return { folder: "Deliverables", icon: FileArchive };
  if (n.includes("credential") || n.includes("login") || t.includes("json") || n.includes(".env"))
    return { folder: "Credentials", icon: FileCode };
  if (t.includes("pdf")) return { folder: "Contracts", icon: FileText };
  return { folder: "Other", icon: FileText };
}

function humanSize(bytes: number): string {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

const FOLDER_ORDER = ["Contracts", "Billing", "Designs", "Deliverables", "Credentials", "Other"];

export default function DocumentsPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ files: FileRow[] }>("/files")
      .then((r) => setFiles(r.files))
      .finally(() => setLoading(false));
  }, []);

  async function download(id: string) {
    const r = await api<{ url: string }>(`/files/${id}/download-url`);
    window.open(r.url, "_blank");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const folders = files.reduce<Record<string, FileRow[]>>((acc, f) => {
    const { folder } = classify(f.name, f.content_type);
    (acc[folder] ??= []).push(f);
    return acc;
  }, {});

  const recent = [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const sortedFolders = FOLDER_ORDER.filter((f) => folders[f]?.length).concat(
    Object.keys(folders).filter((f) => !FOLDER_ORDER.includes(f)),
  );

  return (
    <div className="cp-animate">
      <Breadcrumbs items={[{ label: "Documents" }]} />
      <PageHeader title="Documents" subtitle="Contracts, invoices, designs, and deliverables — organised the way you need them." />

      {files.length === 0 ? (
        <Empty
          title="No documents shared yet"
          hint="Your team hasn't shared any documents yet. When they publish contracts, designs, or deliverables, they'll appear here automatically in folders."
          icon={FolderOpen}
        />
      ) : (
        <div className="space-y-5">
          {recent.length > 0 && (
            <SectionCard title="Recently added" bodyClassName="p-0">
              <div className="divide-y divide-[var(--border)]">
                {recent.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-[var(--muted)]">{relativeTime(f.created_at)}</div>
                    </div>
                    <button onClick={() => download(f.id)} className="text-sm font-medium text-[var(--brand-accent)] flex items-center gap-1 shrink-0">
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {sortedFolders.map((folder) => {
            const items = folders[folder] ?? [];
            const { icon: FolderIcon } = classify(items[0]?.name ?? "", items[0]?.content_type ?? null);
            return (
              <SectionCard key={folder} title={`📁 ${folder}`} icon={FolderIcon} action={<span className="text-xs text-[var(--muted)]">{items.length} files</span>} bodyClassName="p-0">
                <div className="divide-y divide-[var(--border)]">
                  {items.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-xs text-[var(--muted)]">{humanSize(f.size_bytes)} · {relativeTime(f.created_at)}</div>
                      </div>
                      <button onClick={() => download(f.id)} className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-accent)] hover:underline shrink-0">
                        <Download size={15} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
