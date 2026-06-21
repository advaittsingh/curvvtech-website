import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: FileList | File[]) => void;
  onChoose: () => void;
  dragging: boolean;
  onDragState: (dragging: boolean) => void;
};

export function FileDropZone({ onFiles, onChoose, dragging, onDragState }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragState(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
    >
      <Upload className={cn("h-10 w-10 mx-auto mb-3", dragging ? "text-primary" : "text-muted-foreground")} />
      <p className="font-medium">Drop files here</p>
      <p className="text-sm text-muted-foreground mt-1">Upload contracts, proposals, design assets, or project documents.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onChoose}>
        Choose files
      </Button>
    </div>
  );
}
