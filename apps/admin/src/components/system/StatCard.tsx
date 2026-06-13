import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: LucideIcon;
  className?: string;
};

export function StatCard({ title, value, trend, trendUp, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("border-stone-200", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-stone-500">{title}</p>
            <p className="text-2xl font-semibold text-stone-900 truncate">{value}</p>
            {trend && (
              <p className={cn("text-xs", trendUp === false ? "text-red-600" : "text-emerald-600")}>{trend}</p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-stone-100 p-2.5 shrink-0">
              <Icon className="h-5 w-5 text-stone-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
