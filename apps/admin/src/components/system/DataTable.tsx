import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

type DataTableProps<T extends { id: string }> = {
  columns: ColumnDef<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  selectable?: boolean;
  exportable?: boolean;
  exportFileName?: string;
  bulkActions?: ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCta?: ReactNode;
  isLoading?: boolean;
  className?: string;
};

function defaultSearch<T extends Record<string, unknown>>(row: T, query: string): boolean {
  const q = query.toLowerCase();
  return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q));
}

function exportCsv<T extends { id: string }>(columns: ColumnDef<T>[], rows: T[], fileName: string) {
  const headers = columns.map((c) => c.header);
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = c.sortValue ? c.sortValue(row) : "";
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search…",
  searchFilter,
  sortable = true,
  paginated = true,
  pageSize: initialPageSize = 10,
  selectable = false,
  exportable = false,
  exportFileName = "export.csv",
  bulkActions,
  onRowClick,
  emptyTitle = "No results",
  emptyDescription,
  emptyCta,
  isLoading,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const fn = searchFilter ?? ((row: T, q: string) => defaultSearch(row as T & Record<string, unknown>, q));
    return data.filter((row) => fn(row, query));
  }, [data, query, searchFilter]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find((c) => c.id === sortCol);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir, columns]);

  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const pageData = paginated ? sorted.slice(page * pageSize, page * pageSize + pageSize) : sorted;

  const allPageSelected = pageData.length > 0 && pageData.every((r) => selected.has(r.id));

  function toggleSort(id: string) {
    if (!sortable) return;
    const col = columns.find((c) => c.id === id);
    if (!col?.sortValue) return;
    if (sortCol === id) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(id);
      setSortDir("asc");
    }
  }

  function toggleAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageData.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageData.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500 py-8 text-center">Loading…</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchable && (
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {selectable && selected.size > 0 && bulkActions}
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportCsv(columns, sorted, exportFileName)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {pageData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} cta={emptyCta} />
      ) : (
        <div className="rounded-lg border border-stone-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50 hover:bg-stone-50">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={allPageSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.id} className={col.className}>
                    {sortable && col.sortValue ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-stone-600 hover:text-stone-900"
                        onClick={() => toggleSort(col.id)}
                      >
                        {col.header}
                        {sortCol === col.id ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={(checked) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {paginated && sorted.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-stone-600">
          <span>
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="px-1">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
