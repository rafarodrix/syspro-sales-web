"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Sparkles, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import type { PontoFaturamento, ProdutoRankeado } from "@/lib/vendas";
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  formatarK,
  formatarDataVisual,
} from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

type FormatoDoGrafico = "moeda" | "numero";

/**
 * Gera um caminho Bezier cúbico suave a partir de uma lista de pontos (Bklit Area Chart style)
 */
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const nextNext = points[i + 2] || next;

    const tension = 0.25;

    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;

    const cp2x = next.x - (nextNext.x - current.x) * tension;
    const cp2y = next.y - (nextNext.y - current.y) * tension;

    path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`;
  }

  return path;
}

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

  const { pontosArray, pontosAnterioresArray, yLabels, maxVal } = useMemo(() => {
    if (!dados.length)
      return { pontosArray: [], pontosAnterioresArray: [], yLabels: [], maxVal: 1 };

    let max = Math.max(...dados.map((item) => item.total), 1);
    if (temComparacao) {
      const maxAnt = Math.max(
        ...dados.map((item) => item.totalAnterior ?? 0),
        1,
      );
      max = Math.max(max, maxAnt);
    }

    // Margem superior de 12% para os picos respirarem
    max = max * 1.12;

    const step = max / 4;
    const labels = [0, 1, 2, 3, 4].map((i) => Math.round(step * i));

    const pontosArray = dados.map((item, indice) => {
      const x = dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100;
      const y = 88 - (item.total / max) * 76;
      return { x, y, item, indice };
    });

    const pontosAnterioresArray = dados.map((item, indice) => {
      const x = dados.length === 1 ? 50 : (indice / (dados.length - 1)) * 100;
      const totalAnt = item.totalAnterior ?? 0;
      const y = 88 - (totalAnt / max) * 76;
      return { x, y, total: totalAnt };
    });

    return { pontosArray, pontosAnterioresArray, yLabels: labels, maxVal: max };
  }, [dados, temComparacao]);

  const smoothCurrentPath = useMemo(
    () => generateSmoothPath(pontosArray),
    [pontosArray],
  );

  const smoothPreviousPath = useMemo(
    () => generateSmoothPath(pontosAnterioresArray),
    [pontosAnterioresArray],
  );

  const smoothAreaCurrent = useMemo(() => {
    if (pontosArray.length <= 1) return "";
    return `${smoothCurrentPath} L 100,88 L 0,88 Z`;
  }, [smoothCurrentPath, pontosArray]);

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
      className="flex flex-col gap-3.5"
      aria-label="Gráfico Bklit UI de evolução analítica de vendas"
    >
      <div className="relative flex h-72 w-full pt-2">
        {/* Y Axis Labels */}
        <div className="flex flex-col-reverse justify-between pr-3 text-[11px] font-mono font-semibold text-muted-foreground select-none">
          {yLabels.map((val) => (
            <span key={val} className="leading-none">
              {formato === "moeda" ? formatarK(val) : val}
            </span>
          ))}
        </div>

        {/* SVG Chart Area */}
        <div className="relative flex-1 overflow-visible">
          <svg
            className="size-full overflow-visible select-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
          >
            <defs>
              {/* Gradiente de Área Primária - Bklit UI Glow */}
              <linearGradient id={`area-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary, #3b82f6)" stopOpacity="0.38" />
                <stop offset="60%" stopColor="var(--color-primary, #3b82f6)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--color-primary, #3b82f6)" stopOpacity="0.0" />
              </linearGradient>

              {/* Filtro de Glow para a linha principal */}
              <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="var(--color-primary, #3b82f6)" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Linhas de Grade Sutis */}
            {[12, 31, 50, 69, 88].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border/50"
                strokeDasharray="3 3"
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Preenchimento de Área com Curva Suave (Current Period) */}
            {smoothAreaCurrent && (
              <path
                d={smoothAreaCurrent}
                fill={`url(#area-grad-${id})`}
                className="transition-all duration-300"
              />
            )}

            {/* Linha Comparativa do Período Anterior (Dashed) */}
            {temComparacao && smoothPreviousPath && (
              <path
                d={smoothPreviousPath}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Linha Principal com Curva Suave e Glow (Current Period) */}
            {smoothCurrentPath && (
              <path
                d={smoothCurrentPath}
                fill="none"
                stroke="var(--color-primary, #2563eb)"
                strokeWidth="2.4"
                filter={`url(#glow-${id})`}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-300"
              />
            )}

            {/* Linha Guia Vertical no Hover */}
            {pontoHover && (
              <line
                x1={pontoHover.x}
                x2={pontoHover.x}
                y1={12}
                y2={88}
                stroke="var(--color-primary, #3b82f6)"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Marcadores de Nós Interativos (Bklit style) */}
            {pontosArray.map((p, idx) => {
              const isHovered = pontoHover?.indice === idx;
              return (
                <g key={idx} className="cursor-pointer">
                  {/* Ponto externo / anel no hover */}
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.2"
                      fill="var(--color-primary, #3b82f6)"
                      opacity="0.25"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {/* Ponto principal */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "2.8" : "1.6"}
                    className="fill-background stroke-primary transition-all duration-200"
                    strokeWidth={isHovered ? "1.8" : "1"}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Alvo de toque/mouse ampliado */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="transparent"
                    onMouseEnter={() => setPontoHover(p)}
                    onMouseLeave={() => setPontoHover(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Tooltip Card Bklit Glassmorphism */}
          {pontoHover && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl border border-border/80 bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95 min-w-[160px]"
              style={{
                left: `${Math.max(10, Math.min(90, pontoHover.x))}%`,
                top: `calc(${pontoHover.y}% - 12px)`,
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 font-bold text-foreground">
                <span>{pontoHover.item.rotulo}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatarDataVisual(pontoHover.item.data)}
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-muted-foreground">Atual:</span>
                <span className="font-mono font-extrabold text-primary text-xs">
                  {formato === "moeda"
                    ? formatarMoeda(pontoHover.item.total)
                    : formatarNumero(pontoHover.item.total, 0)}
                </span>
              </div>

              {temComparacao && pontoHover.item.totalAnterior !== undefined && (
                <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/40 pt-1 text-[11px]">
                  <span className="text-muted-foreground">Anterior:</span>
                  <span className="font-mono font-semibold text-muted-foreground">
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

      {/* Legenda Executiva Estilo Bklit UI */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary shadow-xs" />
          <span className="font-semibold text-foreground">
            {formato === "moeda" ? "Faturamento Realizado (R$)" : "Volume de Pedidos"}
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

/**
 * Top Produtos com Barras Ranqueadas Bklit UI + Badges de Pódio (#1, #2, #3)
 */
export function GraficoProdutos({ dados, empresaId }: { dados: ProdutoRankeado[]; empresaId?: string }) {
  if (!dados.length) return <EstadoVazio />;

  const maiorValor = Math.max(...dados.map((item) => item.total), 1);
  const step = maiorValor / 4;
  const xTicks = [0, 1, 2, 3, 4].map((i) => Math.round(step * i));

  // Cores de pódio
  const getPodiumBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold text-[10px]">
          <Crown className="size-3" />
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 font-bold text-[10px]">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 font-bold text-[10px]">
          3
        </span>
      );
    }
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground">
        {index + 1}
      </span>
    );
  };

  return (
    <div
      className="flex flex-col justify-between gap-4"
      aria-label="Produtos com maior faturamento"
    >
      <div className="flex flex-col gap-3 py-1">
        {dados.map((item, index) => {
          const href = empresaId
            ? `/vendas?empresa=${empresaId}&busca=${encodeURIComponent(item.produto)}`
            : undefined;

          const content = (
            <div className="group/prod flex flex-col gap-1.5 p-1 rounded-lg transition-all hover:bg-muted/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {getPodiumBadge(index)}
                  <span
                    className={`truncate font-semibold ${
                      href ? "group-hover/prod:text-primary transition-colors" : "text-foreground"
                    }`}
                    title={`${item.id ? `[${item.id}] ` : ""}${item.produto}`}
                  >
                    {item.produto}
                  </span>
                  {item.quantidade > 0 && (
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                      {formatarNumero(item.quantidade, 0)} un
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="font-extrabold text-foreground">
                    {formatarMoeda(item.total)}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    ({formatarPercentual(item.percentual, 1)})
                  </span>
                </div>
              </div>

              {/* Barra com Gradiente Bklit */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 group-hover/prod:brightness-115"
                  style={{
                    width: `${Math.min((item.total / maiorValor) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          );

          return href ? (
            <Link key={`${item.id}-${index}`} href={href} className="block">
              {content}
            </Link>
          ) : (
            <div key={`${item.id}-${index}`}>{content}</div>
          );
        })}
      </div>

      {/* Eixo X com Escala */}
      <div className="flex justify-between border-t border-border/60 pt-2 text-[10px] font-mono font-semibold text-muted-foreground">
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
