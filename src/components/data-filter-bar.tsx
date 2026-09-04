"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataFilterBarProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  placeholder: string;
  children: React.ReactNode;
  onLimpar?: () => void;
  temFiltrosAtivos?: boolean;
}

/** Faixa compacta de busca e filtros, no padrão da consulta de Vendas. */
export function DataFilterBar({
  busca,
  onBuscaChange,
  placeholder,
  children,
  onLimpar,
  temFiltrosAtivos = false,
}: DataFilterBarProps) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2.5 rounded-lg border bg-muted/20 p-3">
      <div className="relative min-w-[200px] flex-1 sm:min-w-[240px]">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(evento) => onBuscaChange(evento.target.value)}
          className="h-9 pl-8 pr-8 text-xs"
          placeholder={placeholder}
        />
        {busca && (
          <button
            type="button"
            onClick={() => onBuscaChange("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            title="Limpar busca"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {children}
      {temFiltrosAtivos && onLimpar && (
        <Button type="button" variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground" onClick={onLimpar}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
