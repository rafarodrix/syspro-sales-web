"use client";

import { useId, useMemo, useState } from "react";
import type { PontoFaturamento, ProdutoRankeado } from "@/lib/vendas";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  formatarK,
  formatarDataVisual,
} from "@/lib/formatters";

type FormatoDoGrafico = "moeda" | "numero";

export function GraficoFaturamento({
  dados,
  formato = "moeda",
  temComparacao = false,
}: {
  dados: PontoFaturamento[];
  formato?: FormatoDoGrafico;
  temComparacao?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const [pontoHover, setPontoHover] = useState<{
    x: number;
    y: number;
    item: PontoFaturamento;
    indice: number;
  } | null>(null);

  const { pontosArray, pontosAnterioresArray, yLabels } = useMemo(() => {
    if (!dados.length)
      return { pontosArray: [], pontosAnterioresArray: [], yLabels: [] };

    let max = Math.max(...dados.map((item) => item.total), 1);
    if (temComparacao) {
      const maxAnt = Math.max(
        ...dados.map((item) => item.totalAnterior ?? 0),
        1,
      );
      max = Math.max(max, maxAnt);
    }

    const step = max / 5;
    const labels = [0, 1, 2, 3, 4, 5].map((i) => Math.round(step * i));

    const pontosArray = dados.map((item, indice) => {
      const x = dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100;
      const y = 88 - (item.total / max) * 72;
      return { x, y, item, indice };
    });

    const pontosAnterioresArray = dados.map((item, indice) => {
      const x = dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100;
      const totalAnt = item.totalAnterior ?? 0;
      const y = 88 - (totalAnt / max) * 72;
      return { x, y, total: totalAnt };
    });

    return { pontosArray, pontosAnterioresArray, yLabels: labels };
  }, [dados, temComparacao]);

  const pontosString = pontosArray.map((p) => `${p.x},${p.y}`).join(" ");
  const pontosAnterioresString = pontosAnterioresArray
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const dateTicks = useMemo(() => {
    if (dados.length <= 8) return dados;
    const step = Math.ceil(dados.length / 8);
    return dados.filter(
      (_, index) => index % step === 0 || index === dados.length - 1,
    );
  }, [dados]);

  if (!dados.length) return <EstadoVazio />;

  return (
    <div
      className="flex flex-col gap-3"
      aria-label="Gráfico de evolução analítica de vendas"
    >
      <div className="relative flex h-68 w-full">
        {/* Y Axis Labels */}
        <div className="flex flex-col-reverse justify-between pr-2 text-[11px] font-mono font-medium text-muted-foreground">
          {yLabels.map((val) => (
            <span key={val} className="leading-none">
              {formato === "moeda" ? formatarK(val) : val}
            </span>
          ))}
        </div>

        {/* SVG Chart Area */}
        <div className="relative flex-1 overflow-visible">
          <svg
            className="size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
          >
            <defs>
              <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary, #3b82f6)"
                  stopOpacity=".25"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary, #3b82f6)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[16, 30.4, 44.8, 59.2, 73.6, 88].map((y) => (
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

            {/* Gradient Fill - Current Period */}
            {pontosArray.length > 1 && (
              <polygon
                points={`0,88 ${pontosString} 100,88`}
                fill={`url(#area-${id})`}
              />
            )}

            {/* Previous Period Comparative Line (Dashed) */}
            {temComparacao && pontosAnterioresArray.length > 1 && (
              <polyline
                points={pontosAnterioresString}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Current Period Polyline */}
            <polyline
              points={pontosString}
              fill="none"
              stroke="var(--color-primary, #2563eb)"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Node Dots & Interactive Hit Areas */}
            {pontosArray.map((p, idx) => (
              <g key={idx} className="cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={pontoHover?.indice === idx ? "3.2" : "1.8"}
                  className="fill-background stroke-primary transition-all duration-150"
                  strokeWidth={pontoHover?.indice === idx ? "1.5" : "0.8"}
                  vectorEffect="non-scaling-stroke"
                />
                {/* Hit target for touch/mouse */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="transparent"
                  onMouseEnter={() => setPontoHover(p)}
                  onMouseLeave={() => setPontoHover(null)}
                />
              </g>
            ))}
          </svg>

          {/* Interactive Tooltip Card */}
          {pontoHover && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
              style={{
                left: `${pontoHover.x}%`,
                top: `calc(${pontoHover.y}% - 10px)`,
              }}
            >
              <div className="font-bold text-foreground">
                {pontoHover.item.rotulo}
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono font-semibold text-primary">
                <span>Período Atual:</span>
                <span>
                  {formato === "moeda"
                    ? formatarMoeda(pontoHover.item.total)
                    : formatarNumero(pontoHover.item.total, 0)}
                </span>
              </div>
              {temComparacao && pontoHover.item.totalAnterior !== undefined && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>Período Anterior:</span>
                  <span>
                    {formato === "moeda"
                      ? formatarMoeda(pontoHover.item.totalAnterior)
                      : formatarNumero(pontoHover.item.totalAnterior, 0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* X Axis Ticks */}
      <div className="flex justify-between pl-8 pr-1 text-[11px] font-mono font-medium text-muted-foreground">
        {dateTicks.map((tick) => (
          <span key={tick.data}>{formatarDataVisual(tick.data)}</span>
        ))}
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-6 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-1 w-4 rounded-full bg-primary" />
          <span className="font-medium text-foreground">
            {formato === "moeda" ? "Faturamento (R$)" : "Volume"}
          </span>
        </div>
        {temComparacao && (
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-muted-foreground" />
            <span>Período Anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function GraficoProdutos({ dados }: { dados: ProdutoRankeado[] }) {
  if (!dados.length) return <EstadoVazio />;

  const maiorValor = Math.max(...dados.map((item) => item.total), 1);
  const step = maiorValor / 4;
  const xTicks = [0, 1, 2, 3, 4].map((i) => Math.round(step * i));

  return (
    <div
      className="flex flex-col justify-between gap-4"
      aria-label="Produtos com maior faturamento"
    >
      <div className="flex flex-col gap-3 py-1">
        {dados.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="group flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <span
                  className="truncate font-semibold text-foreground"
                  title={`${item.id ? `[${item.id}] ` : ""}${item.produto}`}
                >
                  {item.produto}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                <span className="font-bold text-foreground">
                  {formatarMoeda(item.total)}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  ({formatarPercentual(item.percentual, 1)})
                </span>
              </div>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 group-hover:brightness-110"
                style={{
                  width: `${Math.min((item.total / maiorValor) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* X Axis Numbers Calculados Dinamicamente */}
      <div className="flex justify-between border-t border-border/60 pt-2 text-[10px] font-mono font-medium text-muted-foreground">
        {xTicks.map((val) => (
          <span key={val}>{formatarK(val)}</span>
        ))}
      </div>
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
