import { cn } from "@/lib/utils";

/** Significado do percentual — define a cor da barra em todo o app. */
export type TomBarra = "primario" | "positivo" | "atencao" | "negativo" | "neutro";

/** Cor da barra por classe ABC, igual em clientes, curva e margens. */
export function tomPorClasse(classe?: string | null): TomBarra {
  const chave = (classe ?? "").toUpperCase();
  if (chave === "A") return "positivo";
  if (chave === "B") return "primario";
  if (chave === "C") return "atencao";
  return "neutro";
}

const TONS: Record<TomBarra, string> = {
  primario: "bg-primary/15",
  positivo: "bg-emerald-500/20",
  atencao: "bg-amber-500/20",
  negativo: "bg-rose-500/20",
  neutro: "bg-muted",
};

/**
 * Valor com barra de participação ao fundo. A cor vem do significado (tom),
 * não de classes soltas em cada aba — antes cada tela passava a sua.
 */
export function DataBarPercent({
  valor,
  percentual,
  tom = "primario",
  classe,
  cor,
  className,
}: {
  valor: string;
  percentual: number;
  tom?: TomBarra;
  /** Se informada, o tom vem da classe ABC (A/positivo, B/primário, C/atenção). */
  classe?: string | null;
  /** Sobrescreve a classe da barra (usar só em casos especiais). */
  cor?: string;
  className?: string;
}) {
  const largura = Math.min(Math.max(percentual, 0), 100);
  const tomFinal = classe ? tomPorClasse(classe) : tom;
  return (
    <div
      className={cn(
        "relative flex items-center justify-end overflow-hidden rounded px-2 py-0.5 font-mono text-xs",
        className,
      )}
      title={percentual ? `${percentual.toFixed(1)}% do total` : undefined}
    >
      <div
        className={cn("absolute inset-y-0 right-0 rounded-sm transition-all duration-300", cor ?? TONS[tomFinal])}
        style={{ width: `${largura}%` }}
      />
      <span className="relative z-10 font-bold text-foreground tabular-nums">{valor}</span>
    </div>
  );
}
