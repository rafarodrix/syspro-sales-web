import type { ReactNode } from "react";

/**
 * Cabeçalho oficial de página (docs/design-system.md › UX03/UX04).
 *
 * Uma linha: título + contexto (empresa, período, atualização) à esquerda,
 * ações à direita. Substitui o antigo card de consulta com título, descrição
 * longa e rodapé — eram ~190 px antes do primeiro dado.
 */
export function PageHeader({
  titulo,
  meta,
  acoes,
  children,
}: {
  titulo: string;
  /** Contexto curto: empresa · período · atualização. */
  meta?: ReactNode;
  acoes?: ReactNode;
  /** Conteúdo extra na mesma faixa (ex.: seletor de visão). */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="truncate text-[16px] font-bold leading-tight text-foreground">{titulo}</h1>
        {meta ? (
          <p className="mt-0.5 truncate text-[11.5px] leading-tight text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        {children}
        {acoes}
      </div>
    </header>
  );
}
