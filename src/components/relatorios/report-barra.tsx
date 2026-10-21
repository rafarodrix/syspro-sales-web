"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface BarraRelatorioContexto {
  slot: HTMLElement | null;
  definirSlot: (elemento: HTMLElement | null) => void;
}

const BarraRelatorioContext = createContext<BarraRelatorioContexto | null>(null);

export function useBarraRelatorio() {
  return useContext(BarraRelatorioContext);
}

/**
 * Envolve a visão do relatório (barra + conteúdo). A tabela ativa injeta as
 * ações (exportar, colunas, densidade) na barra por portal, mantendo tudo em
 * uma linha só — mesmo quando a visão atual não renderiza tabela.
 */
export function ReportVisaoProvider({ children }: { children: ReactNode }) {
  const [slot, definirSlot] = useState<HTMLElement | null>(null);
  return (
    <BarraRelatorioContext.Provider value={{ slot, definirSlot }}>
      {children}
    </BarraRelatorioContext.Provider>
  );
}

/**
 * Barra de controles da visão atual: controles à esquerda (seletor de visão,
 * ordenação, filtros da visão) e ações da tabela à direita.
 *
 * Fica FORA do bloco condicional — o seletor continua acessível em qualquer
 * estado (carregando, vazio, comparativo sem período), então o usuário nunca
 * fica preso sem conseguir voltar.
 */
export function ReportBarraVisao({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const contexto = useBarraRelatorio();

  return (
    <div
      className={
        className ??
        "no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/[0.06] px-2 py-1.5"
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      <div
        ref={contexto?.definirSlot}
        className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto"
      />
    </div>
  );
}
