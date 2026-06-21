import { cn } from "@/lib/utils";
import type { FileRecord, SmartFolder } from "../file-schemas";
import { countSmartFolder } from "../file-schemas";

type Props = {
  folders: SmartFolder[];
  files: FileRecord[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

export function FileSmartFolderGrid({ folders, files, activeId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
      {folders.map((folder) => {
        const count = countSmartFolder(files, folder);
        const active = activeId === folder.id;
        return (
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelect(active ? null : folder.id)}
            className={cn(
              "rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30",
              active ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border",
            )}
          >
            <span className="text-2xl">{folder.emoji}</span>
            <p className="font-semibold text-sm mt-2">{folder.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{folder.description}</p>
            <p className="text-xs text-muted-foreground mt-2 tabular-nums">{count} file{count === 1 ? "" : "s"}</p>
          </button>
        );
      })}
    </div>
  );
}
