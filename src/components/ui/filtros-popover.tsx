"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Filtros secundários em popover (docs/design-system.md › UX06).
 *
 * A barra de filtros mostra só a busca e o que está ativo; o resto abre aqui.
 * Evita a faixa de 2–3 linhas de selects que empurra a tabela para baixo.
 */
export function FiltrosPopover({
  children,
  ativos = 0,
  rotulo = "Filtros",
}: {
  children: ReactNode;
  /** Quantidade de filtros aplicados — aparece como selo. */
  ativos?: number;
  rotulo?: string;
}) {
  return (
    <details className="group relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-semibold text-foreground marker:hidden hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        {rotulo}
        {ativos > 0 ? (
          <span className="rounded bg-primary/12 px-1.5 text-[11px] font-bold text-primary">{ativos}</span>
        ) : null}
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-72 space-y-2 rounded-lg border bg-popover p-3 shadow-md">
        {children}
      </div>
    </details>
  );
}
