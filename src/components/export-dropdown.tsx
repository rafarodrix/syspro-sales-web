"use client";

import { Download, FileText, Printer, ChevronDown, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExportDropdownProps {
  onExportarPdf?: () => void;
  onExportarCsv?: () => void;
  onImprimir?: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function ExportDropdown({
  onExportarPdf,
  onExportarCsv,
  onImprimir = () => window.print(),
  loading = false,
  disabled = false,
  label = "Exportar",
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className="h-8 gap-1.5 text-xs font-semibold shadow-xs hover:bg-muted/40 cursor-pointer"
        >
          <Download className="size-3.5 text-primary" />
          <span>{label}</span>
          <ChevronDown className="size-3 text-muted-foreground opacity-70 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-1 shadow-lg border-border/80">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Opções de Saída
        </DropdownMenuLabel>

        {onExportarPdf && (
          <DropdownMenuItem
            onClick={onExportarPdf}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <FileText className="size-3.5" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-bold text-foreground leading-tight">Relatório em PDF</span>
              <span className="text-[10px] text-muted-foreground">Documento executivo</span>
            </div>
          </DropdownMenuItem>
        )}

        {onExportarCsv && (
          <DropdownMenuItem
            onClick={onExportarCsv}
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Table className="size-3.5" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-bold text-foreground leading-tight">Planilha (CSV)</span>
              <span className="text-[10px] text-muted-foreground">Excel e dados brutos</span>
            </div>
          </DropdownMenuItem>
        )}

        {onImprimir && (
          <>
            <DropdownMenuSeparator className="my-1 border-border/50" />
            <DropdownMenuItem
              onClick={onImprimir}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted/60"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <Printer className="size-3.5" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="font-bold text-foreground leading-tight">Imprimir</span>
                <span className="text-[10px] text-muted-foreground">Enviar para impressora</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
