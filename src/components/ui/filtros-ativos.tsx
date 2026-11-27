"use client";

import { X } from "lucide-react";

export interface FiltroAtivo {
  /** Rótulo do filtro: "Vendedor", "Período"… */
  rotulo: string;
  /** Valor aplicado, já legível. */
  valor: string;
  onRemover: () => void;
}

/**
 * Chips dos filtros aplicados (docs/design-system.md › UX06).
 *
 * Filtro em popover esconde o recorte; o chip devolve a leitura imediata do
 * que está ativo e permite remover um por um, sem abrir o popover.
 */
export function FiltrosAtivos({
  filtros,
  onLimparTodos,
  className,
}: {
  filtros: FiltroAtivo[];
  onLimparTodos?: () => void;
  className?: string;
}) {
  if (!filtros.length) return null;

  return (
    <div className={className ?? "no-print flex flex-wrap items-center gap-1.5"}>
      {filtros.map((filtro) => (
        <span
          key={`${filtro.rotulo}:${filtro.valor}`}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-muted/40 pl-2 pr-1 text-[11px] text-foreground"
        >
          <span className="text-muted-foreground">{filtro.rotulo}:</span>
          <span className="max-w-[14rem] truncate font-medium">{filtro.valor}</span>
          <button
            type="button"
            onClick={filtro.onRemover}
            aria-label={`Remover filtro ${filtro.rotulo} ${filtro.valor}`}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {onLimparTodos && filtros.length > 1 ? (
        <button
          type="button"
          onClick={onLimparTodos}
          className="h-6 rounded px-1.5 text-[11px] font-semibold text-primary hover:underline"
        >
          Limpar todos
        </button>
      ) : null}
    </div>
  );
}
