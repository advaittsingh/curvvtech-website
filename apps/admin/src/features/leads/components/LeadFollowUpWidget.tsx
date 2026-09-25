import { CalendarClock } from "lucide-react";
import type { Lead } from "../schemas";
import { formatNextFollowUp, formatShortDate } from "../constants";

type Props = {
  lead: Lead;
};

export function LeadFollowUpWidget({ lead }: Props) {
  const items: { when: string; label: string }[] = [];

  if (lead.next_follow_up_at) {
    items.push({
      when: formatNextFollowUp(lead.next_follow_up_at),
      label: "Scheduled follow-up",
    });
  }

  if (lead.expected_close_date) {
    items.push({
      when: formatShortDate(lead.expected_close_date),
      label: "Expected close",
    });
  }

  const status = String(lead.status ?? "new");
  if (status === "proposal_sent") {
    items.push({ when: "Soon", label: "Proposal reminder — check for response" });
  } else if (status === "discovery_call") {
    items.push({ when: "Today", label: "Send proposal after call" });
  }

  if (items.length === 0) {
    items.push({ when: "—", label: "Set next follow-up to stay on track" });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Follow-ups</h3>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 4).map((item) => (
          <li key={item.label} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0 w-20">{item.when}</span>
            <span className="font-medium text-right">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
