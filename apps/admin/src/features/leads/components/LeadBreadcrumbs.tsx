import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  leadName: string;
};

export function LeadBreadcrumbs({ leadName }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <Link to="/leads" className="hover:text-foreground transition-colors">
        Sales
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <Link to="/leads" className="hover:text-foreground transition-colors">
        Leads
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">{leadName}</span>
    </nav>
  );
}
