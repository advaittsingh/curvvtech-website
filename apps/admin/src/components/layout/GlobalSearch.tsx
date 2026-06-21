import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSignature,
  FolderKanban,
  Inbox,
  Loader2,
  Receipt,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { GLOBAL_SEARCH_ITEMS } from "@/lib/nav-config";
import { adminApi } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { getAccessToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type EntityResults = {
  leads: Array<{ id: string; name?: string; email?: string; company?: string; status?: string }>;
  clients: Array<{ id: string; name?: string; email?: string; company?: string; status?: string }>;
  projects: Array<{ id: string; name?: string; status?: string; client_name?: string }>;
  invoices: Array<{ id: string; invoice_number?: string; status?: string; client_name?: string }>;
  proposals: Array<{ id: string; title?: string; status?: string; client_name?: string }>;
};

const EMPTY_RESULTS: EntityResults = {
  leads: [],
  clients: [],
  projects: [],
  invoices: [],
  proposals: [],
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function modKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl K";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K";
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [entityResults, setEntityResults] = useState<EntityResults>(EMPTY_RESULTS);
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const shortcut = useMemo(() => modKeyLabel(), []);

  const navItems = useMemo(
    () =>
      GLOBAL_SEARCH_ITEMS.filter(
        (item) => !item.permission || hasPermission(permissions, item.permission),
      ),
    [permissions],
  );

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navItems.slice(0, 8);
    return navItems.filter((item) =>
      matchesQuery(`${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""}`, query),
    );
  }, [navItems, query]);

  const groupedNav = useMemo(() => {
    return filteredNav.reduce<Record<string, typeof filteredNav>>((acc, item) => {
      const g = item.subtitle || "General";
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    }, {});
  }, [filteredNav]);

  const fetchEntities = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setEntityResults(EMPTY_RESULTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = (await adminApi(getAccessToken()).search(q)) as EntityResults;
        setEntityResults({
          leads: data.leads ?? [],
          clients: data.clients ?? [],
          projects: data.projects ?? [],
          invoices: data.invoices ?? [],
          proposals: data.proposals ?? [],
        });
      } catch {
        setEntityResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    void fetchEntities(debouncedQuery);
  }, [debouncedQuery, fetchEntities, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setEntityResults(EMPTY_RESULTS);
      setLoading(false);
    }
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const hasEntities =
    entityResults.leads.length +
      entityResults.clients.length +
      entityResults.projects.length +
      entityResults.invoices.length +
      entityResults.proposals.length >
    0;

  const showEmpty =
    !loading &&
    debouncedQuery.length >= 2 &&
    !hasEntities &&
    filteredNav.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1 text-left truncate">Search leads, clients, invoices…</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden shrink-0" onClick={() => setOpen(true)} aria-label="Open search">
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search pages, leads, clients, projects…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[min(440px,60vh)]">
          {loading && debouncedQuery.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {showEmpty && <CommandEmpty>No results for &ldquo;{debouncedQuery}&rdquo;</CommandEmpty>}

          {!query.trim() && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Type to search records, or pick a page below
            </div>
          )}

          {entityResults.leads.length > 0 && (
            <CommandGroup heading="Leads">
              {entityResults.leads.map((lead) => (
                <CommandItem key={lead.id} value={`lead-${lead.id}`} onSelect={() => go(`/leads/${lead.id}`)}>
                  <Inbox className="text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{lead.name || lead.email || "Lead"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[lead.company, lead.email, lead.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {entityResults.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {entityResults.clients.map((client) => (
                <CommandItem key={client.id} value={`client-${client.id}`} onSelect={() => go(`/clients/${client.id}`)}>
                  <Users className="text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{client.name || client.company || "Client"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[client.company, client.email, client.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {entityResults.projects.length > 0 && (
            <CommandGroup heading="Projects">
              {entityResults.projects.map((project) => (
                <CommandItem key={project.id} value={`project-${project.id}`} onSelect={() => go(`/projects/${project.id}`)}>
                  <FolderKanban className="text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{project.name || "Project"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[project.client_name, project.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {entityResults.invoices.length > 0 && (
            <CommandGroup heading="Invoices">
              {entityResults.invoices.map((invoice) => (
                <CommandItem key={invoice.id} value={`invoice-${invoice.id}`} onSelect={() => go(`/invoices/${invoice.id}`)}>
                  <Receipt className="text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{invoice.invoice_number || "Invoice"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[invoice.client_name, invoice.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {entityResults.proposals.length > 0 && (
            <CommandGroup heading="Proposals">
              {entityResults.proposals.map((proposal) => (
                <CommandItem key={proposal.id} value={`proposal-${proposal.id}`} onSelect={() => go(`/proposals/${proposal.id}`)}>
                  <FileSignature className="text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{proposal.title || "Proposal"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[proposal.client_name, proposal.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasEntities && filteredNav.length > 0 && <CommandSeparator />}

          {Object.entries(groupedNav).map(([group, groupItems]) => (
            <CommandGroup key={group} heading={query.trim() ? "Pages" : group}>
              {groupItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`page-${item.id}`}
                    onSelect={() => go(item.href)}
                  >
                    <Icon className="text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                      )}
                    </div>
                    <CommandShortcut>{item.href}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
