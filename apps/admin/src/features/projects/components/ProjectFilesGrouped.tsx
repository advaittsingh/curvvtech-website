import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectFile } from "../project-schemas";
import { groupFiles } from "../project-schemas";

type Props = {
  files: ProjectFile[];
  onDownload: (id: string) => void;
};

export function ProjectFilesGrouped({ files, onDownload }: Props) {
  const groups = groupFiles(files);

  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">No files uploaded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, items]) => (
        <section key={group} className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{group}</h4>
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span>{f.name}</span>
                <Button variant="ghost" size="sm" onClick={() => onDownload(f.id)}>
                  <Download className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
