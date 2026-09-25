import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { MiniChart } from "@/components/dashboard/mini-chart";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  href: string;
  label: string;
  value: string | number;
  numericValue?: number;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  accent: string;
  sparkline?: number[];
  children?: React.ReactNode;
};

export function KpiMetricCard({
  href,
  label,
  value,
  numericValue,
  trend,
  trendUp,
  subtitle,
  icon: Icon,
  accent,
  sparkline,
  children,
}: Props) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
      <Link
        to={href}
        className={cn(
          "block rounded-xl border border-border bg-card p-4 shadow-sm overflow-hidden",
          "hover:shadow-lg hover:border-primary/25 transition-shadow duration-200",
          "relative before:absolute before:inset-x-0 before:top-0 before:h-0.5",
          accent,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="rounded-lg bg-muted/80 p-1.5">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums truncate">
              {typeof numericValue === "number" ? (
                <AnimatedNumber value={numericValue} format={() => String(value)} />
              ) : (
                value
              )}
            </p>
            {trend && (
              <p className={cn("text-xs font-medium mt-1 flex items-center gap-0.5", trendUp ? "text-emerald-600" : trendUp === false ? "text-red-600" : "text-muted-foreground")}>
                {trendUp === true && <TrendingUp className="h-3 w-3" />}
                {trendUp === false && <TrendingDown className="h-3 w-3" />}
                {trend}
              </p>
            )}
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {sparkline && sparkline.some((v) => v > 0) && (
          <div className="mt-2 h-10 opacity-80">
            <MiniChart data={sparkline} labels={[]} activeColor="#10b981" />
          </div>
        )}
        {children}
      </Link>
    </motion.div>
  );
}
