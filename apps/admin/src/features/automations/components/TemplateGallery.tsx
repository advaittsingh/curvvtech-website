import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLES, TEMPLATES } from "../automations.constants";
import type { WorkflowTemplate } from "../automations.types";

export function TemplateGallery({ onUse }: { onUse: (template: WorkflowTemplate) => void }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Quick start templates</h2>
        <span className="text-xs text-muted-foreground">Pre-built automations you can launch in one click</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", CATEGORY_STYLES[t.category])}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {t.popular && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    Popular
                  </Badge>
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{t.name}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full group-hover:border-primary group-hover:text-primary"
                onClick={() => onUse(t)}
              >
                Use template
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
