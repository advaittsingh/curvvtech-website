import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  features: string[];
  cta?: ReactNode;
};

/** Scaffold for Business OS modules under active development. */
export function ModulePlaceholder({ title, description, features, cta }: ModulePlaceholderProps) {
  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title={title} description={description} action={cta} />
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Planned capabilities:</p>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-success mt-0.5">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
