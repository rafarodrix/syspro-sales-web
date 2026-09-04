import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TermoExplicado } from "@/components/relatorio-guia";

type DestaqueMetrica = "neutro" | "primario" | "positivo" | "negativo" | "amarelo";

interface MetricaCardProps {
  /** Rótulo curto da métrica. */
  rotulo: string;
  /** Definição exibida no tooltip (documentação da métrica). */
  definicao: string;
  /** Valor principal formatado. */
  valor: string;
  /** Linha auxiliar abaixo do valor (contexto/variação). */
  rodape?: React.ReactNode;
  /** Ícone opcional no canto. */
  icone?: LucideIcon;
  corIcone?: string;
  /** Cor semântica do destaque (borda/fundo/valor). */
  destaque?: DestaqueMetrica;
  /** Valor extra alinhado à direita do valor principal (ex.: Δ badge). */
  suplemento?: React.ReactNode;
}

const estilosDestaque: Record<DestaqueMetrica, { card: string; valor: string; icone: string }> = {
  neutro: {
    card: "border-border/60 bg-card/90",
    valor: "text-foreground",
    icone: "bg-muted/70 text-muted-foreground",
  },
  primario: {
    card: "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card",
    valor: "text-primary",
    icone: "bg-primary/15 text-primary",
  },
  positivo: {
    card: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card",
    valor: "text-emerald-700 dark:text-emerald-400",
    icone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  negativo: {
    card: "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card",
    valor: "text-rose-700 dark:text-rose-400",
    icone: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  amarelo: {
    card: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card",
    valor: "text-amber-700 dark:text-amber-400",
    icone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

/**
 * Card de métrica padronizado dos relatórios: rótulo documentado (tooltip),
 * valor tabular, suplemento (variação) e rodapé — visual único e alinhado.
 */
export function MetricaCard({
  rotulo,
  definicao,
  valor,
  rodape,
  icone: Icone,
  corIcone,
  destaque = "neutro",
  suplemento,
}: MetricaCardProps) {
  const estilo = estilosDestaque[destaque];

  return (
    <Card className={`group relative border shadow-2xs transition-all duration-300 hover:shadow-md ${estilo.card}`}>
      <CardContent className="flex h-full flex-col justify-between gap-2 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <TermoExplicado termo={rotulo} definicao={definicao} />
          {Icone ? (
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${estilo.icone}`}
            >
              <Icone className={`size-3.5 ${corIcone ?? ""}`} />
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-2">
          <span className={`font-mono text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl ${estilo.valor}`}>
            {valor}
          </span>
          {suplemento ? <div className="shrink-0">{suplemento}</div> : null}
        </div>

        {rodape ? (
          <div className="text-[11px] leading-snug text-muted-foreground">{rodape}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
