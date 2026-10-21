import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de seção dos relatórios: eyebrow curto, título e explicação.
 * Padroniza o que cada tela escrevia à mão (h2 + parágrafo solto).
 */
export function SecaoTitulo({
  titulo,
  descricao,
  eyebrow,
  acao,
  className,
}: {
  titulo: string;
  descricao?: ReactNode;
  eyebrow?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-0.5">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        {descricao ? (
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acao ? <div className="no-print flex flex-wrap items-center gap-2">{acao}</div> : null}
    </div>
  );
}
