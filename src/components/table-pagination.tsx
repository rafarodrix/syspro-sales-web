"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarNumero } from "@/lib/formatters";

export interface TablePaginationProps {
  paginaAtual: number;
  totalItens: number;
  itensPorPagina: number;
  onPaginaChange: (pagina: number) => void;
  onItensPorPaginaChange: (itensPorPagina: number) => void;
  labelItens?: string;
  opcoesItensPorPagina?: number[];
  className?: string;
}

export function TablePagination({
  paginaAtual,
  totalItens,
  itensPorPagina,
  onPaginaChange,
  onItensPorPaginaChange,
  labelItens = "registros",
  opcoesItensPorPagina = [15, 25, 50, 100],
  className = "",
}: TablePaginationProps) {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  if (totalItens <= 0) return null;

  return (
    <div
      className={`no-print flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-muted-foreground ${className}`}
    >
      {/* Controles de Itens por Página & Total */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Exibindo</span>
        <select
          value={itensPorPagina}
          onChange={(e) => {
            onItensPorPaginaChange(Number(e.target.value));
            onPaginaChange(1);
          }}
          className="h-8 rounded-md border border-border bg-background px-2 font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer text-xs"
        >
          {opcoesItensPorPagina.map((op) => (
            <option key={op} value={op}>
              {op} por página
            </option>
          ))}
        </select>
        <span>
          de <strong className="text-foreground font-mono">{formatarNumero(totalItens, 0)}</strong> {labelItens}
        </span>
      </div>

      {/* Navegação de Páginas */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPaginaChange(1)}
          disabled={paginaAtual <= 1}
          title="Primeira página"
          aria-label="Primeira página"
          className="size-8"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPaginaChange(Math.max(1, paginaAtual - 1))}
          disabled={paginaAtual <= 1}
          title="Página anterior"
          aria-label="Página anterior"
          className="size-8"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <span className="px-2 font-mono font-semibold text-foreground text-xs select-none">
          Página {paginaAtual} de {totalPaginas}
        </span>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPaginaChange(Math.min(totalPaginas, paginaAtual + 1))}
          disabled={paginaAtual >= totalPaginas}
          title="Próxima página"
          aria-label="Próxima página"
          className="size-8"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPaginaChange(totalPaginas)}
          disabled={paginaAtual >= totalPaginas}
          title="Última página"
          aria-label="Última página"
          className="size-8"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
