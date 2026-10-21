"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BarraRelatorioContexto {
  /** Elemento onde a tabela ativa injeta as ações (exportar, colunas, densidade). */
  slot: HTMLElement | null;
}

const BarraRelatorioContext = createContext<BarraRelatorioContexto | null>(null);

export function useBarraRelatorio() {
  return useContext(BarraRelatorioContext);
}

/**
 * Barra persistente de uma visão de relatório: controles da visão à esquerda e,
 * à direita, as ações da tabela ativa (injetadas por portal pelo `ReportTable`).
 *
 * Fica FORA do bloco condicional da visão — assim o seletor continua visível
 * mesmo quando a visão atual não renderiza tabela (estado vazio, comparativo
 * sem período, carregando), e o usuário nunca fica preso sem poder voltar.
 */
export function ReportBarraVisao({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <BarraRelatorioContext.Provider value={{ slot }}>
      <div
        className={
          className ??
          "no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/[0.06] px-2 py-1.5"
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
        <div ref={setSlot} className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto" />
      </div>
    </BarraRelatorioContext.Provider>
  );
}
