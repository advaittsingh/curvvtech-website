import type { LucideIcon } from "lucide-react";

export type WorkflowCategory =
  | "sales"
  | "projects"
  | "finance"
  | "hr"
  | "marketing"
  | "custom";

export type FieldType = "select" | "text" | "number" | "textarea";

export type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
};

export type TriggerDef = {
  key: string;
  label: string;
  description: string;
  category: WorkflowCategory;
  group: string;
  icon: LucideIcon;
  /** Whether the backend runner currently executes this trigger. */
  live: boolean;
  configFields?: ConfigField[];
};

export type ActionDef = {
  key: string;
  label: string;
  description: string;
  group: string;
  icon: LucideIcon;
  /** Whether the backend runner currently executes this action. */
  live: boolean;
  configFields?: ConfigField[];
};

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains";

export type WorkflowCondition = {
  field: string;
  operator: ConditionOperator;
  value: string;
};

export type WorkflowActionInput = {
  step_order: number;
  action_type: string;
  action_config: Record<string, unknown>;
};

export type TriggerConfig = {
  to_status?: string;
  conditions?: WorkflowCondition[];
  description?: string;
  category?: WorkflowCategory;
  retry_on_failure?: boolean;
  max_retries?: number;
  [key: string]: unknown;
};

export type Workflow = {
  id: string;
  name: string;
  trigger_type: string;
  enabled: boolean;
  trigger_config?: TriggerConfig | null;
  actions?: WorkflowActionInput[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowRun = {
  id: string;
  workflow_id?: string;
  workflow_name?: string;
  entity_type?: string;
  entity_id?: string;
  status?: string;
  result?: unknown;
  createdAt?: string;
};

export type WorkflowDraft = {
  name: string;
  description: string;
  category: WorkflowCategory;
  trigger_type: string;
  trigger_config: TriggerConfig;
  conditions: WorkflowCondition[];
  actions: WorkflowActionInput[];
  enabled: boolean;
  retry_on_failure: boolean;
  max_retries: number;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  icon: LucideIcon;
  popular?: boolean;
  trigger_type: string;
  trigger_config: TriggerConfig;
  actions: WorkflowActionInput[];
};
