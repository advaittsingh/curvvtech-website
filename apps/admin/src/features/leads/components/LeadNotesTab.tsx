import { useState } from "react";
import {
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_PREFIX,
  NoteCategory,
  formatOwnerDisplay,
  formatShortDate,
  parseNoteCategory,
} from "../constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Note = {
  id: string;
  body?: string;
  author_clerk_id?: string | null;
  createdAt?: string;
};

type Props = {
  notes: Note[];
  requirements?: string | null;
  memberMap: Map<string, string>;
  onAddNote: (body: string, category: NoteCategory) => Promise<void>;
};

export function LeadNotesTab({ notes, requirements, memberMap, onAddNote }: Props) {
  const [category, setCategory] = useState<NoteCategory>("meeting");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = NOTE_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = [];
      return acc;
    },
    {} as Record<NoteCategory, Note[]>,
  );

  for (const note of notes) {
    const parsed = parseNoteCategory(note.body ?? "");
    if (parsed.category === "legacy") {
      grouped.internal.push(note);
    } else {
      grouped[parsed.category].push(note);
    }
  }

  async function submit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const body = `${NOTE_CATEGORY_PREFIX[category]}\n${draft.trim()}`;
      await onAddNote(body, category);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as NoteCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{NOTE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Note</Label>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Client wants luxury Shopify website. Inspired by Ridhimehra. Budget ₹50k."
              rows={3}
            />
          </div>
          <Button className="shrink-0" disabled={!draft.trim() || saving} onClick={() => void submit()}>
            Add
          </Button>
        </div>
      </div>

      <Tabs defaultValue="meeting">
        <TabsList>
          {NOTE_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {NOTE_CATEGORY_LABELS[c]}
              {grouped[c].length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({grouped[c].length})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {NOTE_CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <NoteList
              notes={grouped[cat]}
              memberMap={memberMap}
              emptyLabel={`No ${NOTE_CATEGORY_LABELS[cat].toLowerCase()} yet.`}
              showRequirements={cat === "requirements" && Boolean(requirements)}
              requirements={requirements}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function NoteList({
  notes,
  memberMap,
  emptyLabel,
  showRequirements,
  requirements,
}: {
  notes: Note[];
  memberMap: Map<string, string>;
  emptyLabel: string;
  showRequirements?: boolean;
  requirements?: string | null;
}) {
  if (notes.length === 0 && !showRequirements) {
    return <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {showRequirements && requirements && (
        <li className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">From overview</p>
          <p className="text-sm whitespace-pre-wrap">{requirements}</p>
        </li>
      )}
      {notes.map((n) => {
        const parsed = parseNoteCategory(n.body ?? "");
        const author = formatOwnerDisplay(n.author_clerk_id ? memberMap.get(n.author_clerk_id) : null);
        return (
          <li key={n.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium">{author}</span>
              {n.createdAt && (
                <span className="text-xs text-muted-foreground">{formatShortDate(n.createdAt)}</span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{parsed.text}</p>
          </li>
        );
      })}
      {notes.length === 0 && showRequirements && (
        <p className="text-sm text-muted-foreground">Add categorized notes above — overview requirements shown above.</p>
      )}
    </ul>
  );
}
