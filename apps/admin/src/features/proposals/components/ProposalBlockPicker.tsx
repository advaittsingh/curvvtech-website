import { BLOCK_TYPES } from "../constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

export function ProposalBlockPicker({ onAdd }: { onAdd: (block: (typeof BLOCK_TYPES)[number]) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {BLOCK_TYPES.map((block) => (
          <DropdownMenuItem key={block.key} onClick={() => onAdd(block)}>
            <div>
              <p className="font-medium">{block.label}</p>
              {block.description && (
                <p className="text-xs text-muted-foreground">{block.description}</p>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
