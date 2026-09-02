"use client";

import { useId, useMemo } from "react";
import type { PontoFaturamento, ProdutoRankeado } from "@/lib/vendas";

type FormatoDoGrafico = "moeda" | "numero";

const moedaCompleta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function GraficoFaturamento({
  dados,
  formato = "moeda",
}: {
  dados: PontoFaturamento[];
  formato?: FormatoDoGrafico;
}) {
  const id = useId().replace(/:/g, "");

  const { pontosArray, yLabels } = useMemo(() => {
    if (!dados.length) return { pontosArray: [], yLabels: [] };
    const maxVal = Math.max(...dados.map((item) => item.total), 1);

    const step = maxVal / 6;
    const labels = [0, 1, 2, 3, 4, 5, 6].map((i) => Math.round(step * i));

    const pontosArray = dados.map((item, indice) => {
      const x = dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100;
      const y = 88 - (item.total / maxVal) * 72;
      return { x, y, item };
    });

    return { pontosArray, yLabels: labels };
  }, [dados]);

  if (!dados.length) return <EstadoVazio />;

  const pontosString = pontosArray.map((p) => `${p.x},${p.y}`).join(" ");

  const dateTicks = useMemo(() => {
    if (dados.length <= 8) return dados;
    const step = Math.ceil(dados.length / 8);
    return dados.filter((_, index) => index % step === 0 || index === dados.length - 1);
  }, [dados]);

  return (
    <div className="flex flex-col gap-3" aria-label="Gráfico de faturamento diário">
      <div className="relative flex h-64 w-full">
        {/* Y Axis Labels */}
        <div className="flex flex-col-reverse justify-between pr-2 text-[11px] font-medium text-muted-foreground">
          {yLabels.map((val) => (
            <span key={val} className="leading-none">
              {formato === "moeda" ? formatK(val) : val}
            </span>
          ))}
        </div>

        {/* SVG Chart Area */}
        <div className="relative flex-1 overflow-hidden">
          <svg
            className="size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
          >
            <defs>
              <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity=".2" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[16, 28, 40, 52, 64, 76, 88].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="2,2"
                strokeWidth=".4"
              />
            ))}

            {/* Gradient Fill */}
            <polygon points={`0,88 ${pontosString} 100,88`} fill={`url(#area-${id})`} />

            {/* Main Polyline */}
            <polyline
              points={pontosString}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Node Dots */}
            {pontosArray.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="1.8"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* X Axis Ticks */}
      <div className="flex justify-between pl-8 pr-1 text-[11px] font-medium text-muted-foreground">
        {dateTicks.map((tick) => (
          <span key={tick.data}>{formatarDataVisual(tick.data)}</span>
        ))}
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
        <span className="h-0.5 w-4 rounded-full bg-blue-600" />
        <span>Faturamento (R$)</span>
      </div>
    </div>
  );
}

export function GraficoProdutos({ dados }: { dados: ProdutoRankeado[] }) {
  const maior = Math.max(...dados.map((item) => item.total), 1);
  if (!dados.length) return <EstadoVazio />;

  const xTicks = [0, 50000, 100000, 150000, 200000, 250000, 300000];

  return (
    <div
      className="flex flex-col justify-between gap-3"
      aria-label="Produtos com maior faturamento"
    >
      <div className="flex flex-col gap-3 py-1">
        {dados.map((item) => (
          <div key={item.produto} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="truncate max-w-[200px] text-foreground" title={item.produto}>
                {item.produto}
              </span>
              <span className="font-mono text-muted-foreground">
                {moedaCompleta.format(item.total)}
              </span>
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500 hover:bg-blue-500"
                style={{ width: `${Math.min((item.total / maior) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* X Axis Numbers */}
      <div className="flex justify-between border-t pt-2 text-[10px] font-medium text-muted-foreground">
        {xTicks.map((val) => (
          <span key={val}>{val === 0 ? "0" : `${val / 1000}k`}</span>
        ))}
      </div>
    </div>
  );
}

function formatK(valor: number) {
  if (valor === 0) return "0";
  if (valor >= 1000) return `${Math.round(valor / 1000)}k`;
  return String(valor);
}

function formatarDataVisual(dataStr: string) {
  if (dataStr.includes("/")) {
    const parts = dataStr.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dataStr;
  }
  return dataStr;
}

function EstadoVazio() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Sem dados para o período selecionado.
    </div>
  );
}
