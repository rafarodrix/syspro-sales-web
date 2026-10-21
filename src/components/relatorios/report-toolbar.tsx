import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MetricsStrip } from "@/components/analytics/metrics-strip";

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
    <MetricsStrip
      itens={items.map((item) => ({
        rotulo: item.label,
        valor: typeof item.value === "string" ? item.value : String(item.value ?? ""),
        attention: item.attention,
      }))}
    />
  );
}
