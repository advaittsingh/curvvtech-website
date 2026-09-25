"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  CreditCard,
  FileText,
  Upload,
  Download,
  MessageSquare,
  CalendarDays,
  GitPullRequestArrow,
  Flag,
  Sparkles,
  Inbox,
  Rocket,
  UserPlus,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─────────────────────────── formatting helpers ─────────────────────────── */

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#3b82f6",
];
export function colorFor(seed?: string | null): string {
  const s = seed ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function relativeTime(input: string | number | Date | null | undefined): string {
  if (!input) return "";
  const d = new Date(input).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  const fmt = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`;
  if (abs < min) return diff >= 0 ? "just now" : "soon";
  const suffix = (s: string) => (diff >= 0 ? `${s} ago` : `in ${s}`);
  if (abs < hr) return suffix(fmt(Math.round(abs / min), "min"));
  if (abs < day) return suffix(fmt(Math.round(abs / hr), "hour"));
  if (abs < 7 * day) return suffix(fmt(Math.round(abs / day), "day"));
  return new Date(input).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(input: string | number | Date | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function dayGroupLabel(input: string | number | Date): string {
  const d = new Date(input);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString("en-IN", { weekday: "long" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

/* ─────────────────────────── primitives ─────────────────────────── */

export function Card({
  children,
  className,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)]",
        interactive && "transition hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-sm)]", className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 font-semibold text-sm">
          {Icon && <Icon size={16} className="text-[var(--muted)]" />}
          {title}
        </div>
        {action}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

type BtnVariant = "primary" | "outline" | "ghost" | "soft";
export function Btn({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5" };
  const variants: Record<BtnVariant, string> = {
    primary: "text-white bg-[var(--brand)] hover:opacity-90 shadow-[var(--shadow-sm)]",
    outline: "border border-[var(--border-strong)] text-[var(--text)] hover:bg-black/[0.03]",
    ghost: "text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--text)]",
    soft: "bg-black/[0.04] text-[var(--text)] hover:bg-black/[0.07]",
  };
  const cls = cn(base, sizes[size], variants[variant], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

/* ─────────────────────────── status / health ─────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-[var(--ok-bg)] text-[var(--ok)]",
  completed: "bg-[var(--ok-bg)] text-[var(--ok)]",
  approved: "bg-[var(--ok-bg)] text-[var(--ok)]",
  done: "bg-[var(--ok-bg)] text-[var(--ok)]",
  active: "bg-[var(--info-bg)] text-[var(--info)]",
  in_progress: "bg-[var(--info-bg)] text-[var(--info)]",
  sent: "bg-[var(--warn-bg)] text-[var(--warn)]",
  viewed: "bg-[var(--warn-bg)] text-[var(--warn)]",
  pending: "bg-[var(--warn-bg)] text-[var(--warn)]",
  partial: "bg-[var(--warn-bg)] text-[var(--warn)]",
  overdue: "bg-[var(--danger-bg)] text-[var(--danger)]",
  rejected: "bg-[var(--danger-bg)] text-[var(--danger)]",
  cancelled: "bg-slate-100 text-slate-500",
};

export function Badge({ status, className }: { status: string; className?: string }) {
  const cls = STATUS_STYLES[status?.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", cls, className)}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export type HealthLevel = "on_track" | "watch" | "at_risk" | "done";
const HEALTH: Record<HealthLevel, { label: string; dot: string; cls: string }> = {
  on_track: { label: "On Track", dot: "#12b76a", cls: "bg-[var(--ok-bg)] text-[var(--ok)]" },
  watch: { label: "Needs Attention", dot: "#f79009", cls: "bg-[var(--warn-bg)] text-[var(--warn)]" },
  at_risk: { label: "Delayed", dot: "#f04438", cls: "bg-[var(--danger-bg)] text-[var(--danger)]" },
  done: { label: "Delivered", dot: "#12b76a", cls: "bg-[var(--ok-bg)] text-[var(--ok)]" },
};

export function deriveHealth(p: {
  status?: string | null;
  progress_pct?: number | null;
  target_end_date?: string | null;
}): HealthLevel {
  if (p.status === "completed" || (p.progress_pct ?? 0) >= 100) return "done";
  const now = Date.now();
  const target = p.target_end_date ? new Date(p.target_end_date).getTime() : null;
  if (target && !Number.isNaN(target)) {
    if (now > target) return "at_risk";
    if (target - now < 7 * 86_400_000 && (p.progress_pct ?? 0) < 80) return "watch";
  }
  return "on_track";
}

export function HealthPill({ level, label, className }: { level: HealthLevel; label?: string; className?: string }) {
  const h = HEALTH[level] ?? HEALTH.on_track;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", h.cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full cp-live-dot" style={{ background: h.dot }} />
      {label ?? h.label}
    </span>
  );
}

export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "ok" | "warn" | "orange" | "muted";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const bg =
    tone === "ok" ? "var(--ok)" :
    tone === "warn" ? "var(--warn)" :
    tone === "orange" ? "var(--orange)" :
    tone === "muted" ? "var(--muted-2)" :
    "var(--brand)";
  return (
    <div className={cn("w-full h-2 rounded-full bg-black/[0.06] overflow-hidden", className)}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: bg }} />
    </div>
  );
}

export function Ring({
  value,
  size = 76,
  stroke = 7,
  children,
  color,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? "var(--brand)"}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ─────────────────────────── avatar ─────────────────────────── */

export function Avatar({
  name,
  size = 36,
  online,
  className,
}: {
  name?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold"
        style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.4 }}
      >
        {initials(name)}
      </div>
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--panel)]"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: online ? "#12b76a" : "#98a2b3",
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── stat tile ─────────────────────────── */

type Tone = "brand" | "ok" | "warn" | "danger" | "info" | "orange" | "purple";
const TONE_ICON: Record<Tone, string> = {
  brand: "bg-black/[0.05] text-[var(--text)]",
  ok: "bg-[var(--ok-bg)] text-[var(--ok)]",
  warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]",
  orange: "bg-[var(--orange-bg)] text-[var(--orange)]",
  purple: "bg-[var(--purple-bg)] text-[var(--purple)]",
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</div>
          <div className="text-2xl font-bold mt-1.5 truncate">{value}</div>
          {hint && <div className="text-xs text-[var(--muted)] mt-1">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", TONE_ICON[tone])}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────── action item ─────────────────────────── */

export function ActionItem({
  icon: Icon,
  tone = "brand",
  title,
  meta,
  cta,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  meta?: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", TONE_ICON[tone])}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{title}</div>
        {meta && <div className="text-xs text-[var(--muted)] truncate">{meta}</div>}
      </div>
      <div className="shrink-0">{cta}</div>
    </div>
  );
}

/* ─────────────────────────── timeline ─────────────────────────── */

const EVENT_ICON: { match: RegExp; icon: LucideIcon; tone: Tone }[] = [
  { match: /invoice.*paid|payment/, icon: CreditCard, tone: "ok" },       // 🟢 payment received
  { match: /invoice/, icon: CreditCard, tone: "orange" },                 // 🟠 invoice
  { match: /deploy|phase_changed|project\.completed|launch|live/, icon: Rocket, tone: "info" }, // 🔵 deployment
  { match: /file.*upload/, icon: Upload, tone: "info" },
  { match: /file.*download|file/, icon: Download, tone: "info" },
  { match: /proposal.*approved|approval.*approved|approved/, icon: CheckCircle2, tone: "ok" }, // 🟢 approval
  { match: /proposal.*rejected|approval.*rejected|rejected/, icon: AlertTriangle, tone: "danger" },
  { match: /revision/, icon: GitPullRequestArrow, tone: "orange" },
  { match: /milestone/, icon: Flag, tone: "warn" },                        // 🟡 milestone
  { match: /message|conversation|chat/, icon: MessageSquare, tone: "purple" },
  { match: /meeting/, icon: CalendarDays, tone: "purple" },                // 🟣 meeting
  { match: /invited|logged_in|member/, icon: UserPlus, tone: "info" },
  { match: /ai/, icon: Sparkles, tone: "purple" },
];

export function eventVisual(eventType?: string): { icon: LucideIcon; tone: Tone } {
  const t = (eventType ?? "").toLowerCase();
  return EVENT_ICON.find((e) => e.match.test(t)) ?? { icon: CheckCircle2, tone: "brand" };
}

export function TimelineItem({
  eventType,
  title,
  time,
  body,
  actorName,
  last,
}: {
  eventType?: string;
  title: string;
  time?: string;
  body?: string | null;
  actorName?: string | null;
  last?: boolean;
}) {
  const { icon: Icon, tone } = eventVisual(eventType);
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        {/* Colored event node — the tone tells the client at a glance what kind
            of update this is (payment, invoice, deployment, meeting, …). */}
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", TONE_ICON[tone])}>
          <Icon size={15} />
        </div>
        {!last && <div className="w-px flex-1 bg-[var(--border)] my-1" />}
      </div>
      <div className={cn("min-w-0", last ? "pb-0" : "pb-5")}>
        <div className="text-sm font-medium leading-snug">{title}</div>
        {body && <div className="text-sm text-[var(--muted)] mt-0.5 line-clamp-2">{body}</div>}
        <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--muted-2)]">
          {actorName && (
            <>
              <Avatar name={actorName} size={16} />
              <span>{actorName}</span>
            </>
          )}
          {actorName && time && <span>·</span>}
          {time && <span>{time}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── quick action ─────────────────────────── */

export function QuickAction({
  icon: Icon,
  label,
  meta,
  href,
  onClick,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  meta?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: Tone;
}) {
  const inner = (
    <div className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-left transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] cursor-pointer h-full">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", TONE_ICON[tone])}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight truncate">{label}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5 truncate">{meta ?? "View"}</div>
      </div>
      <ArrowRight size={15} className="text-[var(--muted-2)] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
    </div>
  );
  if (href) return <Link href={href} className="block h-full">{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className="w-full h-full">
      {inner}
    </button>
  );
}

/* ─────────────────────────── page header / empty / skeleton ─────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[var(--muted)] text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  title,
  hint,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center py-14 flex flex-col items-center">
      <div className="h-12 w-12 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-4">
        <Icon size={22} className="text-[var(--muted-2)]" />
      </div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="text-sm text-[var(--muted)] mt-1 max-w-sm">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("cp-skeleton rounded-xl", className)} />;
}

/* ─────────────────────────── breadcrumbs ─────────────────────────── */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--muted)] mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--muted-2)]">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--text)] transition font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ─────────────────────────── payment journey ─────────────────────────── */

export function PaymentJourney({
  projectValue,
  paid,
  remaining,
  steps,
  nextLabel,
  invoiceCount,
  receiptCount,
  gstLabel,
}: {
  projectValue: number;
  paid: number;
  remaining: number;
  steps: { title: string; status: "paid" | "pending" | "upcoming"; amount_cents?: number }[];
  nextLabel?: string | null;
  invoiceCount?: number;
  receiptCount?: number;
  gstLabel?: string;
}) {
  const pct = projectValue > 0 ? Math.round((paid / projectValue) * 100) : 0;
  const paidSteps = steps.filter((s) => s.status === "paid").length;

  return (
    <Card className="p-0 overflow-hidden">
      {/* Financial summary — the client's biggest question, answered up top */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[var(--border)]">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Project value</div>
          <div className="text-xl font-bold mt-1">{moneyFmt(projectValue)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid</div>
          <div className="text-xl font-bold mt-1 text-[var(--ok)]">{moneyFmt(paid)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{remaining > 0 ? "Remaining" : "Balance"}</div>
          <div className={cn("text-xl font-bold mt-1", remaining > 0 ? "text-[var(--orange)]" : "text-[var(--ok)]")}>{moneyFmt(remaining)}</div>
          {remaining > 0 && nextLabel && <div className="text-xs text-[var(--muted)] mt-0.5">{nextLabel}</div>}
          {remaining <= 0 && <div className="text-xs text-[var(--ok)] mt-0.5">Fully paid — thank you!</div>}
        </div>
      </div>

      {/* Progress: steps read easier than a bare percentage */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          {steps.length > 0 && (
            <span className="text-xs text-[var(--muted)]">{paidSteps} / {steps.length} payments completed</span>
          )}
        </div>
        <Progress value={pct} tone="ok" className="h-2.5" />
      </div>

      {/* Counts strip (Stripe-style) */}
      {(invoiceCount != null || receiptCount != null || gstLabel) && (
        <div className="px-5 py-3 border-t border-[var(--border)] grid grid-cols-3 gap-3 text-center">
          <MetaCount label="Invoices" value={invoiceCount != null ? String(invoiceCount) : "—"} />
          <MetaCount label="Receipts" value={receiptCount != null ? String(receiptCount) : "—"} />
          <MetaCount label="GST" value={gstLabel ?? "—"} />
        </div>
      )}

      {/* Connected payment timeline */}
      {steps.length > 0 && (
        <div className="px-5 pb-5 pt-4 border-t border-[var(--border)]">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)] mb-3">Payment timeline</div>
          {steps.map((s, i) => {
            const StepIcon = s.status === "paid" ? CheckCircle2 : s.status === "pending" ? Clock : Circle;
            const last = i === steps.length - 1;
            return (
              <div key={`${s.title}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <StepIcon
                    size={18}
                    className={cn(
                      "shrink-0",
                      s.status === "paid" ? "text-[var(--ok)]" : s.status === "pending" ? "text-[var(--orange)]" : "text-[var(--muted-2)]",
                    )}
                  />
                  {!last && <div className={cn("w-0.5 flex-1 my-1", s.status === "paid" ? "bg-[var(--ok)]/40" : "bg-[var(--border)]")} style={{ minHeight: 20 }} />}
                </div>
                <div className={cn("flex-1 min-w-0 flex items-start justify-between gap-3", last ? "pb-0" : "pb-4")}>
                  <div className="min-w-0">
                    <div className={cn("text-sm font-medium", s.status === "paid" && "text-[var(--muted)]")}>{s.title}</div>
                    <div className="text-xs text-[var(--muted-2)]">
                      {s.status === "paid" ? "Paid" : s.status === "pending" ? "Awaiting payment" : "Not yet due"}
                    </div>
                  </div>
                  {s.amount_cents != null && <span className="text-sm font-semibold tabular-nums shrink-0">{moneyFmt(s.amount_cents)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MetaCount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}

function moneyFmt(cents: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
}

/* ─────────────────────────── journal entry ─────────────────────────── */

export function JournalEntry({
  eventType,
  title,
  body,
  actorName,
  time,
  last,
}: {
  eventType?: string;
  title: string;
  body?: string | null;
  actorName?: string | null;
  time?: string;
  last?: boolean;
}) {
  const { icon: Icon, tone } = eventVisual(eventType);
  return (
    <div className={cn("flex gap-3 py-3", !last && "border-b border-[var(--border)]")}>
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", TONE_ICON[tone])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {body && <p className="text-sm text-[var(--muted)] mt-0.5">{body}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          {actorName && <Avatar name={actorName} size={20} />}
          <span className="text-xs text-[var(--muted-2)]">
            {actorName && <>{actorName} · </>}
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}

export const StatusIcon = { CheckCircle2, Circle, Clock };
