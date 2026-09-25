import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  href?: string;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function DashboardCard({ title, description, href, className, children, action }: Props) {
  const inner = (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200",
        href && "hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );

  if (href) return <Link to={href} className="block">{inner}</Link>;
  return inner;
}

export function DashboardSkeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-muted/40 animate-pulse", className)} />;
}
