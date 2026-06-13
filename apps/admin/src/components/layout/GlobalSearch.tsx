import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/app/providers";
import { GLOBAL_SEARCH_ITEMS } from "@/lib/nav-config";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { permissions } = useAuth();

  const items = GLOBAL_SEARCH_ITEMS.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  );

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

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const g = item.group || "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex gap-2 text-stone-500 w-56 justify-between font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search…
        </span>
        <kbd className="pointer-events-none text-[10px] bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
          Ctrl K
        </kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)}>
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, clients, invoices…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(grouped).map(([group, groupItems], i) => (
            <div key={group}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(item.href);
                    }}
                  >
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
