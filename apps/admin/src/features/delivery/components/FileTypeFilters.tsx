import { cn } from "@/lib/utils";
import { FILE_TYPE_FILTERS, type FileTypeFilterId } from "../file-schemas";

type Props = {
  value: FileTypeFilterId;
  onChange: (id: FileTypeFilterId) => void;
};

export function FileTypeFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILE_TYPE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            value === f.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
