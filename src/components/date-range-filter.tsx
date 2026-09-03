"use client";

import { CalendarDaysIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Periodo {
  inicial: string;
  final: string;
}

function paraInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function periodoHoje(): Periodo {
  const data = paraInput(new Date());
  return { inicial: data, final: data };
}

export function periodoOntem(): Periodo {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const data = paraInput(ontem);
  return { inicial: data, final: data };
}

export function periodoUltimos7Dias(): Periodo {
  const hoje = new Date();
  const seteAtras = new Date();
  seteAtras.setDate(hoje.getDate() - 6);
  return { inicial: paraInput(seteAtras), final: paraInput(hoje) };
}

export function periodoUltimos30Dias(): Periodo {
  const hoje = new Date();
  const trintaAtras = new Date();
  trintaAtras.setDate(hoje.getDate() - 29);
  return { inicial: paraInput(trintaAtras), final: paraInput(hoje) };
}

export function periodoMesAtual(): Periodo {
  const hoje = new Date();
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: paraInput(hoje),
  };
}

export function periodoMesAnterior(): Periodo {
  const hoje = new Date();
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    final: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  };
}

export function DateRangeFilter({
  value,
  onChange,
  onConsultar,
  loading = false,
  compact = false,
}: {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
  onConsultar?: (periodo: Periodo) => void;
  loading?: boolean;
  compact?: boolean;
}) {
  const presets: { label: string; value: Periodo }[] = [
    { label: "Hoje", value: periodoHoje() },
    { label: "Ontem", value: periodoOntem() },
    { label: "Últimos 7 dias", value: periodoUltimos7Dias() },
    { label: "Este mês", value: periodoMesAtual() },
    { label: "Mês anterior", value: periodoMesAnterior() },
    { label: "30 dias", value: periodoUltimos30Dias() },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Grupo Esquerdo: Filtros Rápidos + Inputs de Data inline */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Presets rápidos */}
        <div className="flex flex-wrap items-center gap-1">
          {presets.map((preset) => {
            const ativo =
              value.inicial === preset.value.inicial &&
              value.final === preset.value.final;
            return (
              <Button
                key={preset.label}
                onClick={() => {
                  onChange(preset.value);
                  onConsultar?.(preset.value);
                }}
                size="sm"
                type="button"
                variant={ativo ? "default" : "outline"}
                className={`h-8 px-2.5 text-xs font-semibold ${
                  ativo
                    ? "shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        {/* Divisor Vertical */}
        <div className="hidden h-5 w-px bg-border/80 sm:block" />

        {/* Inputs de Data Inline */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">De:</span>
            <Input
              id="dt-inicial"
              type="date"
              value={value.inicial}
              onChange={(event) =>
                onChange({ ...value, inicial: event.target.value })
              }
              className="h-8 w-[138px] text-xs font-mono font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Até:</span>
            <Input
              id="dt-final"
              type="date"
              value={value.final}
              onChange={(event) =>
                onChange({ ...value, final: event.target.value })
              }
              className="h-8 w-[138px] text-xs font-mono font-medium"
            />
          </div>
        </div>
      </div>

      {/* Grupo Direito: Botão de Consulta */}
      {!compact && onConsultar && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onConsultar(value)}
            disabled={loading}
            size="sm"
            className="h-8 font-semibold gap-1.5 px-4 shadow-sm"
          >
            <SearchIcon className="size-3.5" />
            {loading ? "Consultando..." : "Consultar"}
          </Button>
        </div>
      )}
    </div>
  );
}
