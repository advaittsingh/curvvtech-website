import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TimelineList({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("space-y-0", className)}>{children}</div>;
}

export function TimelineItem({
  icon,
  children,
  isLast = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center w-8 shrink-0">
        {icon}
        {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[1.25rem] my-1.5" aria-hidden />}
      </div>
      <div className={cn("min-w-0 flex-1 pt-0.5", !isLast && "pb-6")}>{children}</div>
    </div>
  );
}
