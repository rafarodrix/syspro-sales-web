import type { ReactNode } from "react";

/**
 * Barra de consulta/filtros oficial (docs/design-system.md › UX06).
 *
 * Faixa única e compacta: filtros à esquerda, ações à direita. Substitui o card
 * de consulta com título, descrição e rodapé. Tudo que altera a consulta entra
 * aqui; filtro de visão entra na barra do próprio relatório.
 */
export function SearchToolbar({
  filtros,
  acoes,
  aviso,
  className,
}: {
  filtros: ReactNode;
  acoes?: ReactNode;
  /** Texto curto de estado: período aplicado, período pendente, última atualização. */
  aviso?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Consulta e filtros"
      className={
        className ??
        "no-print flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/25 px-2 py-1.5"
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{filtros}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {aviso ? (
          <span className="text-[11px] text-muted-foreground">{aviso}</span>
        ) : null}
        {acoes}
      </div>
    </section>
  );
}
