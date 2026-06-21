import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { NoteType, ProjectNote } from "../project-schemas";
import { NOTE_TYPE_LABELS, NOTE_TYPES } from "../project-schemas";

const FILTER_CHIPS: { id: "all" | NoteType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "internal", label: "Internal" },
  { id: "client", label: "Client updates" },
  { id: "meeting", label: "Meeting notes" },
  { id: "ai", label: "AI insights" },
];

type Props = {
  notes: ProjectNote[];
  body: string;
  noteType: NoteType;
  filter: "all" | NoteType;
  onBody: (v: string) => void;
  onType: (v: NoteType) => void;
  onFilter: (v: "all" | NoteType) => void;
  onPost: () => void;
  posting?: boolean;
};

export function ProjectNotesTab({ notes, body, noteType, filter, onBody, onType, onFilter, onPost, posting }: Props) {
  const filtered =
    filter === "all" ? notes : notes.filter((n) => (n.note_type ?? n.visibility) === filter);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4 space-y-3 max-w-xl">
        <Textarea value={body} onChange={(e) => onBody(e.target.value)} placeholder="Write a note…" rows={3} />
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onType(t)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                noteType === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border hover:bg-muted",
              )}
            >
              {NOTE_TYPE_LABELS[t].replace(" notes", "").replace(" updates", "")}
            </button>
          ))}
        </div>
        <Button size="sm" disabled={!body.trim() || posting} onClick={onPost}>
          Post note
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onFilter(chip.id)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
              filter === chip.id ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-muted",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <NoteList notes={filtered} />
    </div>
  );
}

function NoteList({ notes }: { notes: ProjectNote[] }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">No notes in this category.</p>;
  return (
    <ul className="space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex gap-2 items-center mb-1">
            <Badge variant="outline" className="text-[10px]">
              {NOTE_TYPE_LABELS[(n.note_type ?? n.visibility ?? "internal") as NoteType] ?? n.note_type}
            </Badge>
            {n.createdAt && (
              <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
            )}
          </div>
          <p className="leading-relaxed">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}
