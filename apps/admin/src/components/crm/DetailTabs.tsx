import type { ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function DetailTabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsList
      className={cn(
        "flex-wrap h-auto w-full justify-start gap-1 bg-muted/60 p-1.5 rounded-xl",
        className,
      )}
    >
      {children}
    </TabsList>
  );
}

export function DetailTabTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-semibold data-[state=active]:text-foreground",
        className,
      )}
    >
      {children}
    </TabsTrigger>
  );
}
