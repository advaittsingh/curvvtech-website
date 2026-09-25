import { useEffect, useState } from "react";
import { Archive, Check, FileText, FolderKanban, Receipt, Wallet } from "lucide-react";
import type { ClientDeletionPreview } from "../schemas";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  preview: ClientDeletionPreview | null;
  loading?: boolean;
  onArchive: () => void;
  onDelete: () => void;
};

function CountRow({ icon: Icon, label, count }: { icon: typeof FileText; label: string; count: number }) {
  if (count <= 0) return null;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span>
        {count} {label}
      </span>
    </li>
  );
}

export function ClientDeleteDialog({
  open,
  onOpenChange,
  clientName,
  preview,
  loading,
  onArchive,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<"archive" | "delete">("archive");
  const [confirmed, setConfirmed] = useState(false);

  const canDelete = preview?.can_delete ?? false;
  const blocked = preview && !canDelete;

  useEffect(() => {
    if (open) {
      setMode(canDelete ? "archive" : "archive");
      setConfirmed(false);
    }
  }, [open, canDelete]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>This action cannot be undone if you permanently delete.</p>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</p>
                <p className="font-semibold text-foreground mt-1">{clientName}</p>
              </div>

              {preview && (
                <div>
                  <p className="text-sm font-medium mb-2">This client currently has:</p>
                  <ul className="space-y-1.5">
                    <CountRow icon={FolderKanban} label={preview.projects === 1 ? "Project" : "Projects"} count={preview.projects} />
                    <CountRow icon={Receipt} label={preview.invoices === 1 ? "Invoice" : "Invoices"} count={preview.invoices} />
                    <CountRow icon={Wallet} label={preview.payments === 1 ? "Payment" : "Payments"} count={preview.payments} />
                    <CountRow icon={FileText} label={preview.files === 1 ? "File" : "Files"} count={preview.files} />
                    {preview.notes > 0 && (
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {preview.notes} {preview.notes === 1 ? "Note" : "Notes"}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {blocked ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">This client cannot be permanently deleted</p>
                  <p className="mt-1 text-amber-800/90">
                    {preview?.block_reason ??
                      "Active projects, invoices, or payments exist. Archive the client instead to preserve records."}
                  </p>
                </div>
              ) : (
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as "archive" | "delete")} className="space-y-2">
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="archive" id="mode-archive" className="mt-0.5" />
                    <Label htmlFor="mode-archive" className="text-sm font-normal cursor-pointer">
                      <span className="font-medium">Archive client instead</span>
                      <span className="block text-muted-foreground text-xs mt-0.5">Recommended — hides from active list, keeps all records</span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="delete" id="mode-delete" className="mt-0.5" />
                    <Label htmlFor="mode-delete" className="text-sm font-normal cursor-pointer">
                      <span className="font-medium text-destructive">Permanently delete client</span>
                      <span className="block text-muted-foreground text-xs mt-0.5">Only when no financial records exist</span>
                    </Label>
                  </div>
                </RadioGroup>
              )}

              {!blocked && mode === "delete" && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm-delete"
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(v === true)}
                  />
                  <Label htmlFor="confirm-delete" className="text-sm font-normal leading-snug cursor-pointer">
                    I understand this cannot be undone.
                  </Label>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {blocked ? (
            <Button onClick={onArchive} disabled={loading}>
              <Archive className="h-4 w-4 mr-1.5" />
              Archive client
            </Button>
          ) : mode === "archive" ? (
            <Button onClick={onArchive} disabled={loading}>
              Archive client
            </Button>
          ) : (
            <Button variant="destructive" onClick={onDelete} disabled={loading || !confirmed}>
              Delete
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
