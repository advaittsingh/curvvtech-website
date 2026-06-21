import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { FileText, Globe, Image, FileCheck, FileSignature, Upload } from "lucide-react";
import type { Lead } from "../schemas";
import { FILE_CATEGORIES } from "../constants";
import { Button } from "@/components/ui/button";

const FILE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  requirements: FileText,
  references: Globe,
  brand: Image,
  contracts: FileCheck,
  proposals: FileSignature,
};

type Props = {
  lead: Lead;
};

export function LeadFilesTab({ lead }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Everything tied to this deal — briefs, references, brand assets, contracts, and proposals.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FILE_CATEGORIES.map((cat) => {
          const Icon = FILE_ICONS[cat.key] ?? FileText;
          const linkedProposal = cat.key === "proposals" && lead.converted_proposal_id;
          return (
            <div
              key={cat.key}
              className="rounded-xl border border-dashed border-border bg-muted/10 p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-background border border-border p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">{cat.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
              </div>
              {linkedProposal ? (
                <Button variant="outline" size="sm" asChild className="mt-auto">
                  <Link to={`/proposals/${lead.converted_proposal_id}`}>View proposal</Link>
                </Button>
              ) : lead.converted_client_id ? (
                <Button variant="ghost" size="sm" className="mt-auto gap-1.5" asChild>
                  <Link to="/files">
                    <Upload className="h-3.5 w-3.5" />
                    Upload in file manager
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground mt-auto">Upload after client conversion</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
