import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ProjectPanelError({
  title = "Couldn't load this section",
  message = "The server returned an error. Try again or refresh the page.",
  onRetry,
}: Props) {
  return (
    <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 py-8 px-4 text-center space-y-3">
      <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}
