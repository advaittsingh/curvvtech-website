import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "../expense-schemas";

export type ExpenseFormPayload = {
  category: string;
  description: string;
  amount_cents: number;
  expense_date: string;
  vendor: string | null;
  project_id: string | null;
};

type Project = { id: string; name?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  loading?: boolean;
  scanLoading?: boolean;
  editId?: string | null;
  form: {
    category: string;
    description: string;
    amount: string;
    vendor: string;
    expense_date: string;
    project_id: string;
  };
  onFormChange: (patch: Partial<Props["form"]>) => void;
  onSubmit: () => void;
  onScanReceipt: (imageBase64: string) => void;
};

export function ExpenseCreateDialog({
  open,
  onOpenChange,
  projects,
  loading,
  scanLoading,
  editId,
  form,
  onFormChange,
  onSubmit,
  onScanReceipt,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setScanHint("Scanning receipt…");
      onScanReceipt(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!editId && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                disabled={scanLoading}
                onClick={() => fileRef.current?.click()}
              >
                {scanLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload receipt
              </Button>
              {scanHint && <p className="text-xs text-muted-foreground mt-1">{scanHint}</p>}
            </div>
          )}

          <div>
            <Label>Expense title</Label>
            <Input value={form.description} onChange={(e) => onFormChange({ description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={(e) => onFormChange({ amount: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => onFormChange({ expense_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => onFormChange({ category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Project (optional)</Label>
            <Select
              value={form.project_id || "__none__"}
              onValueChange={(v) => onFormChange({ project_id: v === "__none__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => onFormChange({ vendor: e.target.value })} placeholder="Adobe, Figma, etc." />
          </div>
          <Button
            className="w-full"
            disabled={!form.description || !form.amount || loading}
            onClick={onSubmit}
          >
            {loading ? "Saving…" : editId ? "Update expense" : "Save expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
