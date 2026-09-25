import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  variant: "archived" | "deleted";
  onRestore: () => void;
  loading?: boolean;
};

export function ClientLifecycleBanner({ variant, onRestore, loading }: Props) {
  const isDeleted = variant === "deleted";

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        isDeleted
          ? "border-red-200 bg-red-50/80 text-red-900"
          : "border-amber-200 bg-amber-50/80 text-amber-900"
      }`}
    >
      <div className="flex items-start gap-2 text-sm">
        {isDeleted ? <Trash2 className="h-4 w-4 shrink-0 mt-0.5" /> : <Archive className="h-4 w-4 shrink-0 mt-0.5" />}
        <div>
          <p className="font-medium">{isDeleted ? "This client has been deleted" : "This client is archived"}</p>
          <p className="text-xs opacity-80 mt-0.5">
            {isDeleted
              ? "Hidden from active lists. Restore to bring back into your workspace."
              : "Hidden from the default client list. Projects, invoices, and payments are preserved."}
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 bg-background" onClick={onRestore} disabled={loading}>
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Restore client
      </Button>
    </div>
  );
}
