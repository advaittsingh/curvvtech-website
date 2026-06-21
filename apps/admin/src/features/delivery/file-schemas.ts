import { formatDistanceToNow, parseISO } from "date-fns";

export type FileRecord = {
  id: string;
  name: string;
  content_type?: string | null;
  size_bytes?: number;
  version?: number;
  folder_id?: string | null;
  folder_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  uploaded_by_user_id?: string | null;
  uploader_email?: string | null;
  uploader_name?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export type FolderRecord = {
  id: string;
  name: string;
  parent_id?: string | null;
  file_count?: number;
  project_id?: string | null;
  client_id?: string | null;
};

export type FileSummary = {
  total: number;
  storage_bytes: number;
  recent_uploads: number;
  folders: number;
};

export type FileActivityEvent = {
  id: string;
  action: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string | null;
  actor_email?: string | null;
  file_name?: string | null;
};

export type FileVersion = {
  id: string;
  version: number;
  createdAt?: string;
  uploader_name?: string | null;
  size_bytes?: number;
};

export type SmartFolder = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  match: (file: FileRecord) => boolean;
};

export const SMART_FOLDERS: SmartFolder[] = [
  {
    id: "clients",
    label: "Clients",
    emoji: "👥",
    description: "Client-linked documents",
    match: (f) => Boolean(f.client_id) || /client/i.test(f.name),
  },
  {
    id: "projects",
    label: "Projects",
    emoji: "📁",
    description: "Project deliverables",
    match: (f) => Boolean(f.project_id),
  },
  {
    id: "contracts",
    label: "Contracts",
    emoji: "📋",
    description: "Agreements & legal",
    match: (f) => /contract|agreement|nda|msa|sow/i.test(f.name),
  },
  {
    id: "invoices",
    label: "Invoices",
    emoji: "🧾",
    description: "Billing documents",
    match: (f) => /invoice|receipt|bill|payment/i.test(f.name),
  },
  {
    id: "proposals",
    label: "Proposals",
    emoji: "📄",
    description: "Quotes & scopes",
    match: (f) => /proposal|quote|scope|pitch/i.test(f.name),
  },
  {
    id: "internal",
    label: "Internal",
    emoji: "🔒",
    description: "Ops & team docs",
    match: (f) => /internal|ops|sop|hr|policy/i.test(f.name) || f.folder_name?.toLowerCase().includes("internal"),
  },
  {
    id: "brand",
    label: "Brand Assets",
    emoji: "🎨",
    description: "Logos & guidelines",
    match: (f) => /logo|brand|font|guideline|styleguide/i.test(f.name) || /\.(ai|svg|eps)$/i.test(f.name),
  },
];

export const FILE_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "pdf", label: "PDF", match: (f: FileRecord) => f.content_type?.includes("pdf") || /\.pdf$/i.test(f.name) },
  { id: "images", label: "Images", match: (f: FileRecord) => f.content_type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name) },
  { id: "videos", label: "Videos", match: (f: FileRecord) => f.content_type?.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name) },
  { id: "documents", label: "Documents", match: (f: FileRecord) => /\.(docx?|txt|rtf)$/i.test(f.name) || f.content_type?.includes("word") },
  { id: "design", label: "Design Files", match: (f: FileRecord) => /\.(fig|sketch|psd|xd|ai)$/i.test(f.name) || /design|mockup|wireframe/i.test(f.name) },
  { id: "spreadsheets", label: "Spreadsheets", match: (f: FileRecord) => /\.(xlsx?|csv)$/i.test(f.name) || f.content_type?.includes("spreadsheet") },
] as const;

export type FileTypeFilterId = (typeof FILE_TYPE_FILTERS)[number]["id"];

export const DOC_TEMPLATES = [
  { id: "proposal", label: "Proposal", folder: "Proposals" },
  { id: "invoice", label: "Invoice", folder: "Invoices" },
  { id: "contract", label: "Contract", folder: "Contracts" },
  { id: "meeting", label: "Meeting Notes", folder: "Internal" },
  { id: "requirements", label: "Requirements Doc", folder: "Projects" },
  { id: "scope", label: "Project Scope", folder: "Projects" },
] as const;

export function formatBytes(bytes?: number | null): string {
  const n = Number(bytes ?? 0);
  if (n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatStorage(bytes?: number | null): string {
  const n = Number(bytes ?? 0);
  if (n <= 0) return "0 B";
  return formatBytes(n);
}

export function fileIcon(name: string, contentType?: string | null): string {
  const n = name.toLowerCase();
  if (contentType?.includes("pdf") || n.endsWith(".pdf")) return "📄";
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(n) || contentType?.startsWith("image/")) return "🖼️";
  if (/\.(fig|sketch|psd|xd|ai)$/.test(n)) return "🎨";
  if (/\.(mp4|mov|webm)$/.test(n) || contentType?.startsWith("video/")) return "🎬";
  if (/\.(xlsx?|csv)$/.test(n)) return "📊";
  if (/\.(docx?|txt)$/.test(n)) return "📝";
  if (/invoice|receipt/.test(n)) return "🧾";
  if (/proposal|quote/.test(n)) return "📋";
  return "📎";
}

export function uploaderLabel(name?: string | null, email?: string | null): string {
  if (name) return name.split("@")[0] ?? name;
  if (email) return email.split("@")[0] ?? email;
  return "Unknown";
}

export function formatFileAge(iso?: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function versionBaseName(name: string): string {
  return name
    .replace(/[_\-\s]?v?\d+(\.\d+)?(?=\.[^.]+$)/i, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
}

export function groupVersionFamilies(files: FileRecord[]): Map<string, FileRecord[]> {
  const map = new Map<string, FileRecord[]>();
  for (const f of files) {
    const key = versionBaseName(f.name);
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => Number(b.version ?? 1) - Number(a.version ?? 1));
  }
  return map;
}

export function latestVersionFiles(files: FileRecord[]): FileRecord[] {
  const families = groupVersionFamilies(files);
  return [...families.values()].map((list) => list[0]!);
}

export function filterFiles(
  files: FileRecord[],
  opts: {
    search: string;
    typeFilter: FileTypeFilterId;
    smartFolderId: string | null;
    folderId: string | null;
  },
): FileRecord[] {
  const smart = SMART_FOLDERS.find((s) => s.id === opts.smartFolderId);
  const typeDef = FILE_TYPE_FILTERS.find((t) => t.id === opts.typeFilter);

  return files.filter((f) => {
    if (opts.folderId && f.folder_id !== opts.folderId) return false;
    if (smart && !smart.match(f)) return false;
    if (opts.typeFilter !== "all" && typeDef && "match" in typeDef && !typeDef.match(f)) return false;
    if (opts.search.trim()) {
      const q = opts.search.toLowerCase();
      const hay = `${f.name} ${f.project_name ?? ""} ${f.client_name ?? ""} ${f.folder_name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function countSmartFolder(files: FileRecord[], smart: SmartFolder): number {
  return files.filter((f) => smart.match(f)).length;
}

export function describeFileActivity(event: FileActivityEvent): string {
  const actor = event.actor_name ?? event.actor_email ?? "Someone";
  const name = event.file_name ?? (event.details?.name as string | undefined) ?? "a file";
  switch (event.action) {
    case "file_uploaded":
      return `${actor} uploaded ${name}`;
    case "file_deleted":
      return `${actor} deleted ${name}`;
    case "files_organized":
      return `${actor} organized ${event.details?.moved ?? "several"} files with AI`;
    default:
      return `${actor} updated ${name}`;
  }
}

export function searchFiles(files: FileRecord[], q: string): FileRecord[] {
  if (!q.trim()) return files;
  const needle = q.toLowerCase();
  return files.filter((f) =>
    `${f.name} ${f.project_name ?? ""} ${f.client_name ?? ""}`.toLowerCase().includes(needle),
  );
}
