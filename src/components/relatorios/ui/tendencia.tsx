import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarMoeda, formatarPercentual } from "@/lib/formatters";

export type TendenciaTom = "positivo" | "negativo" | "neutro" | "novo";

/**
 * Marcador único de variação usado nos relatórios: valor absoluto, percentual
 * ou os dois. Substitui os blocos de badge que cada aba repetia.
 */
export function Tendencia({
  valor,
  percentual,
  novo = false,
  zeroComoEstavel = true,
  mostrarValor = true,
  sufixoPercentual,
  className,
}: {
  /** Variação absoluta (R$, un, etc.). */
  valor?: number;
  /** Variação percentual. `null` = sem base de comparação. */
  percentual?: number | null;
  novo?: boolean;
  zeroComoEstavel?: boolean;
  mostrarValor?: boolean;
  /** Ex.: "p.p." quando a variação é de participação. */
  sufixoPercentual?: string;
  className?: string;
}) {
  if (novo) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary",
          className,
        )}
        title="Sem faturamento no período de comparação"
      >
        <Sparkles className="size-3" /> novo
      </span>
    );
  }

  const referencia = valor ?? percentual ?? 0;
  const tom: TendenciaTom =
    zeroComoEstavel && referencia === 0
      ? "neutro"
      : referencia > 0
        ? "positivo"
        : "negativo";

  const Icone =
    tom === "positivo" ? ArrowUpRight : tom === "negativo" ? ArrowDownRight : Minus;

  const tons: Record<TendenciaTom, string> = {
    positivo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    negativo: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    neutro: "bg-muted text-muted-foreground",
    novo: "bg-primary/10 text-primary",
  };

  const partes: string[] = [];
  if (mostrarValor && valor !== undefined) {
    const sinal = valor > 0 ? "+" : "";
    partes.push(`${sinal}${formatarMoeda(valor)}`);
  }
  if (percentual !== undefined && percentual !== null) {
    const sinal = percentual > 0 ? "+" : "";
    partes.push(
      `${sinal}${formatarPercentual(percentual, 1)}${sufixoPercentual ? ` ${sufixoPercentual}` : ""}`,
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums",
        tons[tom],
        className,
      )}
    >
      <Icone className="size-3" />
      {partes.length ? partes.join(" (") + (partes.length > 1 ? ")" : "") : "estável"}
    </span>
  );
}
