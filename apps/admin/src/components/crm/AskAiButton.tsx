import { Sparkles, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type AiAction = { label: string; onClick: () => void };

type Props = {
  onOpenSummary: () => void;
  actions?: AiAction[];
};

const DEFAULT_ACTIONS: AiAction[] = [
  { label: "Summarize relationship", onClick: () => {} },
  { label: "Outstanding payments", onClick: () => {} },
  { label: "Generate email", onClick: () => {} },
  { label: "Suggest next step", onClick: () => {} },
];

export function AskAiButton({ onOpenSummary, actions }: Props) {
  const items = actions ?? DEFAULT_ACTIONS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 shadow-sm">
          <Sparkles className="h-4 w-4" />
          Ask AI
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onOpenSummary}>
          <Sparkles className="h-4 w-4 mr-2" />
          Summarize relationship
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {items.filter((a) => a.label !== "Summarize relationship").map((a) => (
          <DropdownMenuItem key={a.label} onClick={a.onClick}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
