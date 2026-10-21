import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReportViewOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ReportViewSelectorProps<T extends string> {
  view: T;
  onViewChange: (view: T) => void;
  description?: string;
  options: readonly ReportViewOption<T>[];
  ariaLabel?: string;
}

/** Padrão único para alternar perspectivas válidas de um relatório. */
export function ReportViewSelector<T extends string>({
  view,
  onViewChange,
  options,
  ariaLabel = "Visão do relatório",
}: ReportViewSelectorProps<T>) {
  return (
    <section className="flex flex-wrap items-center">
      <div
        className="flex w-full flex-wrap items-center gap-0.5 rounded-lg bg-muted/50 p-0.5 sm:w-auto"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = view === value;
          return (
            <Button
              key={value}
              type="button"
              aria-pressed={active}
              variant={active ? "secondary" : "ghost"}
              className={cn(
                "h-8 flex-1 gap-1.5 text-xs sm:flex-none",
                active
                  ? "bg-background font-semibold text-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
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
