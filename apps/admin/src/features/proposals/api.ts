export type ProposalSection = {
  id: string;
  type: "cover" | "about" | "scope" | "timeline" | "pricing" | "terms" | "signature";
  title: string;
  content: string;
};

export type Proposal = {
  id: string;
  title: string;
  clientName: string;
  status: "draft" | "sent" | "viewed" | "approved" | "rejected";
  sections: ProposalSection[];
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "curvvtech_proposals";

const DEFAULT_SECTIONS: ProposalSection[] = [
  { id: "cover", type: "cover", title: "Cover", content: "" },
  { id: "about", type: "about", title: "About", content: "" },
  { id: "scope", type: "scope", title: "Scope", content: "" },
  { id: "timeline", type: "timeline", title: "Timeline", content: "" },
  { id: "pricing", type: "pricing", title: "Pricing", content: "" },
  { id: "terms", type: "terms", title: "Terms", content: "" },
  { id: "signature", type: "signature", title: "Signature", content: "" },
];

function read(): Proposal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Proposal[]) : [];
  } catch {
    return [];
  }
}

function write(items: Proposal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const proposalsApi = {
  list: async (): Promise<Proposal[]> => read(),
  get: async (id: string): Promise<Proposal | null> => read().find((p) => p.id === id) ?? null,
  create: async (input: { title: string; clientName: string }): Promise<Proposal> => {
    const now = new Date().toISOString();
    const proposal: Proposal = {
      id: crypto.randomUUID(),
      title: input.title,
      clientName: input.clientName,
      status: "draft",
      sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
      createdAt: now,
      updatedAt: now,
    };
    write([proposal, ...read()]);
    return proposal;
  },
  update: async (id: string, patch: Partial<Proposal>): Promise<Proposal | null> => {
    const items = read();
    const idx = items.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
    write(items);
    return items[idx];
  },
  remove: async (id: string): Promise<void> => {
    write(read().filter((p) => p.id !== id));
  },
  shareLink: (p: Proposal) => `${window.location.origin}${window.location.pathname}#/proposals/share/${p.shareToken ?? p.id}`,
};
