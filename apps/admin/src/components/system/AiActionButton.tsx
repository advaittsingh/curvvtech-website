import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AiActionButtonProps = {
  label: string;
  loading?: boolean;
  onClick: () => void | Promise<void>;
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export function AiActionButton({ label, loading, onClick, variant = "outline", className }: AiActionButtonProps) {
  return (
    <Button variant={variant} size="sm" className={cn("gap-2", className)} disabled={loading} onClick={() => void onClick()}>
      <Sparkles className="h-4 w-4" />
      {loading ? "Generating…" : label}
    </Button>
  );
}
