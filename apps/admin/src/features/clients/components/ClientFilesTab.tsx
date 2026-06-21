import { Link } from "react-router-dom";
import { FileText, Image, Receipt, FolderOpen, FileCheck } from "lucide-react";
import type { ComponentType } from "react";
import { FILE_CATEGORIES } from "../constants";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  contracts: FileCheck,
  brand: Image,
  requirements: FileText,
  invoices: Receipt,
  projects: FolderOpen,
};

export function ClientFilesTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Everything client-specific — contracts, assets, requirements, and deliverables.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FILE_CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.key] ?? FileText;
          return (
            <div key={cat.key} className="rounded-xl border border-dashed border-border p-4 space-y-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <h4 className="text-sm font-medium">{cat.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/files">Open file manager</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
