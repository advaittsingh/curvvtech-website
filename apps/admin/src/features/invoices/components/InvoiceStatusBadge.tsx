import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusMeta } from "../invoice-schemas";

type Props = {
  status: string;
  className?: string;
};

export function InvoiceStatusBadge({ status, className }: Props) {
  const meta = statusMeta(status);
  return (
    <Badge variant="outline" className={cn("font-medium", meta.badge, className)}>
      {meta.emoji} {meta.label}
    </Badge>
  );
}
