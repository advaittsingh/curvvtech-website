import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Filter, Plus, Trash2, Zap, X, GripVertical } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ACTIONS,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  TRIGGERS,
  getAction,
  getTrigger,
} from "../automations.constants";
import type {
  ConfigField,
  WorkflowActionInput,
  WorkflowCategory,
  WorkflowCondition,
  WorkflowDraft,
} from "../automations.types";

const CATEGORY_OPTIONS: { value: WorkflowCategory; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "projects", label: "Projects" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "custom", label: "Custom" },
];

function groupBy<T extends { group: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
}

function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const str = value == null ? "" : String(value);
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{field.label}</Label>
        <Select value={str} onValueChange={onChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{field.label}</Label>
        <Textarea value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{field.label}</Label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={str}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: WorkflowDraft | null;
  onChange: (draft: WorkflowDraft) => void;
  onSave: () => void;
  saving?: boolean;
  isEdit?: boolean;
};

export function WorkflowBuilder({ open, onOpenChange, draft, onChange, onSave, saving, isEdit }: Props) {
  const [local, setLocal] = useState<WorkflowDraft | null>(draft);

  useEffect(() => {
    setLocal(draft);
  }, [draft]);

  const triggerGroups = useMemo(() => groupBy(TRIGGERS), []);
  const actionGroups = useMemo(() => groupBy(ACTIONS), []);

  if (!local) return null;

  function update(patch: Partial<WorkflowDraft>) {
    const next = { ...local!, ...patch };
    setLocal(next);
    onChange(next);
  }

  const trigger = getTrigger(local.trigger_type);

  function setTrigger(key: string) {
    const def = getTrigger(key);
    update({ trigger_type: key, category: def?.category ?? local!.category, trigger_config: {} });
  }

  function setTriggerConfig(key: string, value: string) {
    update({ trigger_config: { ...local!.trigger_config, [key]: value } });
  }

  function addCondition() {
    update({ conditions: [...local!.conditions, { field: "status", operator: "eq", value: "" }] });
  }

  function updateCondition(i: number, patch: Partial<WorkflowCondition>) {
    const next = local!.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    update({ conditions: next });
  }

  function removeCondition(i: number) {
    update({ conditions: local!.conditions.filter((_, idx) => idx !== i) });
  }

  function addAction(actionType: string) {
    const next: WorkflowActionInput = {
      step_order: local!.actions.length,
      action_type: actionType,
      action_config: {},
    };
    update({ actions: [...local!.actions, next] });
  }

  function updateActionConfig(i: number, key: string, value: string) {
    const next = local!.actions.map((a, idx) =>
      idx === i ? { ...a, action_config: { ...a.action_config, [key]: value } } : a,
    );
    update({ actions: next });
  }

  function removeAction(i: number) {
    update({ actions: local!.actions.filter((_, idx) => idx !== i) });
  }

  function moveAction(i: number, dir: -1 | 1) {
    const next = [...local!.actions];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ actions: next });
  }

  const canSave = local.name.trim().length > 0 && local.trigger_type.length > 0 && local.actions.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>{isEdit ? "Edit workflow" : "Create workflow"}</SheetTitle>
          <SheetDescription>Build an automation: when something happens, run these actions.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Basics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Workflow name</Label>
              <Input
                value={local.name}
                placeholder="e.g. Lead won → create project"
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={local.description}
                placeholder="What does this automation do?"
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={local.category} onValueChange={(v) => update({ category: v as WorkflowCategory })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* WHEN */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white">
                <Zap className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold">WHEN — Trigger</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {trigger ? (
                    <span className="flex items-center gap-2">
                      <trigger.icon className="h-4 w-4" /> {trigger.label}
                      {!trigger.live && (
                        <Badge variant="secondary" className="text-[10px]">
                          Soon
                        </Badge>
                      )}
                    </span>
                  ) : (
                    "Choose a trigger…"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-80 w-[--radix-dropdown-menu-trigger-width] overflow-y-auto">
                {Object.entries(triggerGroups).map(([group, items]) => (
                  <div key={group}>
                    <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground">{group}</DropdownMenuLabel>
                    {items.map((t) => (
                      <DropdownMenuItem key={t.key} onClick={() => setTrigger(t.key)}>
                        <t.icon className="mr-2 h-4 w-4" /> {t.label}
                        {!t.live && (
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            Soon
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {trigger?.configFields && trigger.configFields.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {trigger.configFields.map((f) => (
                  <ConfigFieldInput
                    key={f.key}
                    field={f}
                    value={local.trigger_config[f.key]}
                    onChange={(v) => setTriggerConfig(f.key, v)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* IF */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500 text-white">
                  <Filter className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold">IF — Conditions</span>
                <span className="text-xs text-muted-foreground">(optional · all must match)</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={addCondition}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {local.conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No conditions — runs every time the trigger fires.</p>
            ) : (
              <div className="space-y-2">
                {local.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="w-8 text-center text-[10px] font-semibold text-blue-600">AND</span>}
                    {i === 0 && <span className="w-8 text-center text-[10px] font-semibold text-muted-foreground">IF</span>}
                    <Select value={c.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.operator}
                      onValueChange={(v) => updateCondition(i, { operator: v as WorkflowCondition["operator"] })}
                    >
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={c.value}
                      placeholder="value"
                      className="h-9 flex-1"
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                    />
                    <button
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      onClick={() => removeCondition(i)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* THEN */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white">
                  <ArrowDown className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold">THEN — Actions</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add action
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
                  {Object.entries(actionGroups).map(([group, items]) => (
                    <div key={group}>
                      <DropdownMenuLabel className="text-[11px] uppercase text-muted-foreground">
                        {group}
                      </DropdownMenuLabel>
                      {items.map((a) => (
                        <DropdownMenuItem key={a.key} onClick={() => addAction(a.key)}>
                          <a.icon className="mr-2 h-4 w-4" /> {a.label}
                          {!a.live && (
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              Soon
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {local.actions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add at least one action to run when this fires.</p>
            ) : (
              <div className="space-y-2">
                {local.actions.map((a, i) => {
                  const def = getAction(a.action_type);
                  const Icon = def?.icon ?? Zap;
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <button
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            onClick={() => moveAction(i, -1)}
                            disabled={i === 0}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">{def?.label ?? a.action_type}</span>
                        {def && !def.live && (
                          <Badge variant="secondary" className="text-[10px]">
                            Soon
                          </Badge>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                            onClick={() => moveAction(i, 1)}
                            disabled={i === local.actions.length - 1}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded p-1 text-red-500 hover:bg-red-50"
                            onClick={() => removeAction(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {def?.configFields && def.configFields.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {def.configFields.map((f) => (
                            <ConfigFieldInput
                              key={f.key}
                              field={f}
                              value={a.action_config[f.key]}
                              onChange={(v) => updateActionConfig(i, f.key, v)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 rounded-xl border border-border p-4">
            <span className="text-sm font-semibold">Settings</span>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Enabled</div>
                <div className="text-xs text-muted-foreground">Turn the workflow on immediately after saving.</div>
              </div>
              <Switch checked={local.enabled} onCheckedChange={(v) => update({ enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Retry on failure</div>
                <div className="text-xs text-muted-foreground">Automatically retry failed actions.</div>
              </div>
              <Switch checked={local.retry_on_failure} onCheckedChange={(v) => update({ retry_on_failure: v })} />
            </div>
            {local.retry_on_failure && (
              <div className="flex items-center justify-between">
                <div className="text-sm">Max retries</div>
                <Input
                  type="number"
                  className="h-9 w-20"
                  value={String(local.max_retries)}
                  onChange={(e) => update({ max_retries: Number(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className={cn("gap-2")} disabled={!canSave || saving} onClick={onSave}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create workflow"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
