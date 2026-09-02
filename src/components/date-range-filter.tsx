"use client";

import { CalendarDaysIcon } from "lucide-react";
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
function periodoAtual(): Periodo {
  const hoje = new Date();
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: paraInput(hoje),
  };
}
function periodoAnterior(): Periodo {
  const hoje = new Date();
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    final: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  };
}
function hoje(): Periodo {
  const data = paraInput(new Date());
  return { inicial: data, final: data };
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
}) {
  const presets: { label: string; value: Periodo }[] = [
    { label: "Hoje", value: hoje() },
    { label: "Mês atual", value: periodoAtual() },
    { label: "Mês anterior", value: periodoAnterior() },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            onClick={() => onChange(preset.value)}
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
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDaysIcon /> Período personalizado disponível a qualquer
        momento.
      </p>
    </div>
  );
}
