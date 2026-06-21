import { useState } from "react";
import type { ClientNote } from "../schemas";
import { formatOwnerDisplay, formatShortDate } from "../constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  notes: ClientNote[];
  onAddNote: (body: string) => Promise<void>;
};

export function ClientNotesTab({ notes, onAddNote }: Props) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onAddNote(draft.trim());
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Add a note about this client relationship…"
        />
        <Button disabled={!draft.trim() || saving} onClick={() => void submit()}>Add note</Button>
      </div>

      <ul className="space-y-3">
        {notes.length === 0 ? (
          <li className="text-sm text-muted-foreground border border-dashed rounded-xl p-8 text-center">
            Notes stack here over time — nothing is overwritten.
          </li>
        ) : (
          notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">{formatShortDate(n.createdAt)}</span>
                <span className="text-xs text-muted-foreground">— {formatOwnerDisplay(n.author_email)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
