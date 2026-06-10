type LiveState = {
  callLogId: string;
  crmLeadId: string;
  leadName: string | null;
  leadPhone: string | null;
  status: "dialing" | "connected" | "talking" | "ended";
  startedAt: number;
  lastAiText: string | null;
};

const calls = new Map<string, LiveState>();

export function liveUpsert(partial: Partial<LiveState> & Pick<LiveState, "callLogId">) {
  const cur = calls.get(partial.callLogId);
  const next: LiveState = {
    callLogId: partial.callLogId,
    crmLeadId: partial.crmLeadId ?? cur?.crmLeadId ?? "",
    leadName: partial.leadName ?? cur?.leadName ?? null,
    leadPhone: partial.leadPhone ?? cur?.leadPhone ?? null,
    status: partial.status ?? cur?.status ?? "dialing",
    startedAt: partial.startedAt ?? cur?.startedAt ?? Date.now(),
    lastAiText: partial.lastAiText ?? cur?.lastAiText ?? null,
  };
  calls.set(partial.callLogId, next);
}

export function liveRemove(callLogId: string) {
  calls.delete(callLogId);
}

export function liveListRecent(maxAgeMs: number) {
  const now = Date.now();
  const out: LiveState[] = [];
  for (const s of calls.values()) {
    if (now - s.startedAt <= maxAgeMs && s.status !== "ended") out.push(s);
  }
  out.sort((a, b) => b.startedAt - a.startedAt);
  return out;
}

