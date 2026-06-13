import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  cta?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, cta, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="rounded-full bg-stone-100 p-4 mb-4 text-stone-500">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-base font-medium text-stone-900">{title}</h3>
      {description && <p className="text-sm text-stone-500 mt-1 max-w-sm">{description}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
