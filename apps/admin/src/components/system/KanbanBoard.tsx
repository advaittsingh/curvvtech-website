import { cn } from "@/lib/utils";

export type KanbanColumn<T> = {
  id: string;
  title: string;
  items: T[];
  subtitle?: string;
};

type KanbanBoardProps<T extends { id: string }> = {
  columns: KanbanColumn<T>[];
  onMove: (itemId: string, toColumnId: string) => void;
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  className?: string;
  /** Desktop column count — defaults to number of pipeline columns */
  desktopColumns?: number;
  /** Fixed-width columns with horizontal scroll on desktop */
  compact?: boolean;
  renderEmptyColumn?: (column: KanbanColumn<T>) => React.ReactNode;
};

function desktopGridClass(count: number): string {
  if (count <= 4) return "xl:grid-cols-4";
  if (count === 5) return "xl:grid-cols-5";
  return "xl:grid-cols-6";
}

function KanbanColumnShell<T extends { id: string }>({
  col,
  onMove,
  renderCard,
  onCardClick,
  mobile,
  compact,
  renderEmptyColumn,
}: {
  col: KanbanColumn<T>;
  onMove: (itemId: string, toColumnId: string) => void;
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  mobile?: boolean;
  compact?: boolean;
  renderEmptyColumn?: (column: KanbanColumn<T>) => React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/30 flex flex-col min-h-[240px] min-w-0",
        mobile && "min-w-[260px] shrink-0 w-[260px]",
        compact && !mobile && "w-[260px] shrink-0",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, col.id);
      }}
    >
      <div className="flex items-start justify-between border-b border-border px-3 py-2.5 shrink-0 gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground truncate block">{col.title}</span>
          {col.subtitle && <span className="text-[10px] text-muted-foreground block mt-0.5">{col.subtitle}</span>}
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums bg-background/80 px-1.5 py-0.5 rounded-md shrink-0">
          {col.items.length}
        </span>
      </div>
      <div className="space-y-2 p-2 flex-1 min-h-[140px]">
        {col.items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
            onClick={() => onCardClick?.(item)}
            className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm active:cursor-grabbing hover:border-foreground/20 hover:shadow-md transition-shadow"
          >
            {renderCard(item)}
          </div>
        ))}
        {col.items.length === 0 && renderEmptyColumn?.(col)}
      </div>
    </div>
  );
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  onMove,
  renderCard,
  onCardClick,
  className,
  desktopColumns,
  compact,
  renderEmptyColumn,
}: KanbanBoardProps<T>) {
  const desktopCols = desktopColumns ?? columns.length;
  const gridDesktop = desktopGridClass(desktopCols);

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile only — horizontal scroll is OK */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:hidden snap-x snap-mandatory">
        {columns.map((col) => (
          <KanbanColumnShell
            key={`m-${col.id}`}
            col={col}
            onMove={onMove}
            renderCard={renderCard}
            onCardClick={onCardClick}
            renderEmptyColumn={renderEmptyColumn}
            mobile
          />
        ))}
      </div>

      {compact ? (
        <div className="hidden md:flex gap-3 overflow-x-auto pb-2">
          {columns.map((col) => (
            <KanbanColumnShell
              key={col.id}
              col={col}
              onMove={onMove}
              renderCard={renderCard}
              onCardClick={onCardClick}
              renderEmptyColumn={renderEmptyColumn}
              compact
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "hidden md:grid w-full overflow-x-hidden gap-3 pb-2",
            "md:grid-cols-3",
            gridDesktop,
          )}
        >
          {columns.map((col) => (
            <KanbanColumnShell
              key={col.id}
              col={col}
              onMove={onMove}
              renderCard={renderCard}
              onCardClick={onCardClick}
              renderEmptyColumn={renderEmptyColumn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
