import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReportViewOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ReportViewSelectorProps<T extends string> {
  view: T;
  onViewChange: (view: T) => void;
  description: string;
  options: readonly ReportViewOption<T>[];
  ariaLabel?: string;
}

/** Padrão único para alternar perspectivas válidas de um relatório. */
export function ReportViewSelector<T extends string>({
  view,
  onViewChange,
  description,
  options,
  ariaLabel = "Visão do relatório",
}: ReportViewSelectorProps<T>) {
  return (
    <section className="rounded-lg border bg-muted/20 p-2 sm:flex sm:items-center sm:justify-between">
      <div className="mb-2 sm:mb-0">
        <p className="text-xs font-bold text-foreground">Escolha como analisar</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-1 rounded-md border bg-background p-0.5 sm:w-auto" role="group" aria-label={ariaLabel}>
        {options.map(({ value, label, icon: Icon }) => {
          const active = view === value;
          return (
            <Button
              key={value}
              type="button"
              aria-pressed={active}
              variant={active ? "secondary" : "ghost"}
              className="h-8 flex-1 gap-1.5 text-xs sm:flex-none"
              onClick={() => onViewChange(value)}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
