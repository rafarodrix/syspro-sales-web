"use client";

import { CalendarDaysIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
export function periodoHoje(): Periodo {
  const data = paraInput(new Date());
  return { inicial: data, final: data };
}

export function DateRangeFilter({
  value,
  onChange,
  onConsultar,
  loading = false,
}: {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
  onConsultar?: (periodo: Periodo) => void;
  loading?: boolean;
}) {
  const presets: { label: string; value: Periodo }[] = [
    { label: "Hoje", value: periodoHoje() },
    { label: "Mês atual", value: periodoMesAtual() },
    { label: "Mês anterior", value: periodoMesAnterior() },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            onClick={() => {
              onChange(preset.value);
              onConsultar?.(preset.value);
            }}
            size="sm"
            type="button"
            variant={
              value.inicial === preset.value.inicial &&
              value.final === preset.value.final
                ? "secondary"
                : "outline"
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dt-inicial">Data inicial</Label>
          <Input
            id="dt-inicial"
            type="date"
            value={value.inicial}
            onChange={(event) =>
              onChange({ ...value, inicial: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dt-final">Data final</Label>
          <Input
            id="dt-final"
            type="date"
            value={value.final}
            onChange={(event) =>
              onChange({ ...value, final: event.target.value })
            }
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDaysIcon /> Período personalizado disponível a qualquer
          momento.
        </p>
        {onConsultar ? (
          <Button onClick={() => onConsultar(value)} disabled={loading}>
            <SearchIcon data-icon="inline-start" />
            {loading ? "Consultando..." : "Consultar"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
