import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatusRelatorioItem {
  rotulo: string;
  valor: ReactNode;
  /** Destaca o valor (ex.: filtros ativos, alerta). */
  destaque?: boolean;
  /** Tooltip explicando o dado. */
  definicao?: string;
}

/**
 * Linha de status do rodapé dos relatórios: universo consultado, período e
 * filtros ativos. Substitui o markup que cada tela repetia no fim do card.
 */
export function StatusRelatorio({
  itens,
  className,
}: {
  itens: StatusRelatorioItem[];
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground",
        className,
      )}
    >
      {itens.map((item) => (
        <span
          key={item.rotulo}
          title={item.definicao}
          className={cn(
            "tabular-nums",
            item.definicao && "cursor-help",
            item.destaque && "font-semibold text-foreground",
          )}
        >
          <span className="text-muted-foreground">{item.rotulo}: </span>
          {item.valor}
        </span>
      ))}
    </div>
  );
}
