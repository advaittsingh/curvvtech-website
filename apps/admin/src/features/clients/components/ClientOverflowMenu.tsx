import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Archive, Copy, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type Props = {
  isArchived?: boolean;
  isDeleted?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  loading?: string;
};

export function ClientOverflowMenu({
  isArchived,
  isDeleted,
  onEdit,
  onArchive,
  onDuplicate,
  onExport,
  onDelete,
  onRestore,
  loading,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="px-2.5" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit} disabled={Boolean(isDeleted)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit client
        </DropdownMenuItem>
        {!isDeleted && !isArchived && (
          <DropdownMenuItem onClick={onArchive} disabled={loading === "archive"}>
            <Archive className="h-4 w-4 mr-2" />
            Archive client
          </DropdownMenuItem>
        )}
        {(isArchived || isDeleted) && onRestore && (
          <DropdownMenuItem onClick={onRestore} disabled={loading === "restore"}>
            <Archive className="h-4 w-4 mr-2" />
            Restore client
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDuplicate} disabled={loading === "duplicate"}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate client
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport} disabled={loading === "export"}>
          <Download className="h-4 w-4 mr-2" />
          Export client
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          disabled={Boolean(isDeleted) || loading === "delete"}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
