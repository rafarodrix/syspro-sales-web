"use client";

import { useId, useMemo } from "react";
import type { PontoFaturamento, ProdutoRankeado } from "@/lib/vendas";

type FormatoDoGrafico = "moeda" | "numero";

const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function GraficoFaturamento({
  dados,
  formato = "moeda",
}: {
  dados: PontoFaturamento[];
  formato?: FormatoDoGrafico;
}) {
  const id = useId().replace(/:/g, "");
  const pontos = useMemo(() => {
    if (!dados.length) return "";
    const maior = Math.max(...dados.map((item) => item.total), 1);
    return dados
      .map(
        (item, indice) =>
          `${dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100},${92 - (item.total / maior) * 76}`,
      )
      .join(" ");
  }, [dados]);
  if (!dados.length) return <EstadoVazio />;
  return (
    <div className="h-64" aria-label="Gráfico de faturamento diário">
      <svg
        className="size-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
      >
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity=".22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[16, 40, 64, 88].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="var(--border)"
            strokeWidth=".45"
          />
        ))}
        <polygon points={`0,92 ${pontos} 100,92`} fill={`url(#area-${id})`} />
        <polyline
          points={pontos}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
        <span>{dados[0]?.rotulo}</span>
        <span>
          {formatarValor(Math.max(...dados.map((item) => item.total)), formato)}
        </span>
        <span>{dados.at(-1)?.rotulo}</span>
      </div>
    </div>
  );
}

function formatarValor(valor: number, formato: FormatoDoGrafico) {
  return formato === "moeda"
    ? moedaCompacta.format(valor)
    : new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(valor);
}

export function GraficoProdutos({ dados }: { dados: ProdutoRankeado[] }) {
  const maior = Math.max(...dados.map((item) => item.total), 1);
  if (!dados.length) return <EstadoVazio />;
  return (
    <div
      className="flex h-64 flex-col justify-center gap-4"
      aria-label="Produtos com maior faturamento"
    >
      {dados.map((item) => (
        <div
          key={item.produto}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1"
        >
          <span className="truncate text-sm font-medium" title={item.produto}>
            {item.produto}
          </span>
          <span className="text-xs text-muted-foreground">
            {moedaCompacta.format(item.total)}
          </span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(item.total / maior) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Sem dados para o período selecionado.
    </div>
  );
}
