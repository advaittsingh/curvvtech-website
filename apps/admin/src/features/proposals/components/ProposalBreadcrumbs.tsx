import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  proposalTitle: string;
  clientName?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  clientId?: string | null;
};

export function ProposalBreadcrumbs({ proposalTitle, clientName, leadId, leadName, clientId }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link to="/proposals" className="hover:text-foreground transition-colors">
        Sales
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <Link to="/proposals" className="hover:text-foreground transition-colors">
        Proposals
      </Link>
      {clientId && clientName && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link to={`/clients/${clientId}`} className="hover:text-foreground transition-colors truncate max-w-[140px]">
            {clientName}
          </Link>
        </>
      )}
      {leadId && leadName && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link to={`/leads/${leadId}`} className="hover:text-foreground transition-colors truncate max-w-[140px]">
            {leadName}
          </Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">{proposalTitle}</span>
    </nav>
  );
}
