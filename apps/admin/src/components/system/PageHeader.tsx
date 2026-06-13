import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6", className)}>
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {description && <p className="text-sm text-stone-600 mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
