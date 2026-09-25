import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const ProjectSection = forwardRef<HTMLElement, Props>(function ProjectSection(
  { id, title, description, action, children, className },
  ref,
) {
  return (
    <section ref={ref} id={id} className={cn("scroll-mt-32", className)}>
      <div className="flex items-end justify-between gap-3 mb-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
});
