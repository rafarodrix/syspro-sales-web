import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ReportToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">{children}</div>
  );
}

export function ReportFilters({
  children,
  count = 0,
  onClear,
}: {
  children: ReactNode;
  count?: number;
  onClear?: () => void;
}) {
  return (
    <details className="rounded-md border p-2 text-xs">
      <summary className="cursor-pointer font-medium">
        Filtros{count ? ` (${count})` : ""}
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        {count && onClear ? (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </details>
  );
}

export function ReportMetricStrip({
  items,
}: {
  items: { label: string; value: ReactNode; attention?: boolean }[];
}) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-md border px-4 py-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={
              item.attention
                ? "text-lg font-semibold tabular-nums text-destructive"
                : "text-lg font-semibold tabular-nums"
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
