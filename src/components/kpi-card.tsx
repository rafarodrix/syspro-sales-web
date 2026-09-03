"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  variacao?: string;
  valorAnterior?: string;
  periodoComparado?: string;
  tendenciaPositiva?: boolean;
  neutro?: boolean;
  destaque?: boolean;
  icone: React.ElementType;
  sparklineData?: number[];
}

function renderSparklineSvg(data: number[], tendenciaPositiva: boolean, neutro: boolean) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 64;
  const height = 24;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const corLinha = neutro
    ? "#94a3b8"
    : tendenciaPositiva
      ? "#10b981"
      : "#f43f5e";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-6 w-14 sm:w-16 shrink-0 overflow-visible opacity-80 transition-opacity group-hover:opacity-100"
    >
      <path
        d={pathD}
        fill="none"
        stroke={corLinha}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(",")[0]}
          cy={points[points.length - 1].split(",")[1]}
          r="2"
          fill={corLinha}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

export function KpiCard({
  titulo,
  valor,
  subtitulo,
  variacao,
  valorAnterior,
  periodoComparado,
  tendenciaPositiva = true,
  neutro = false,
  destaque = false,
  icone: Icone,
  sparklineData,
}: KpiCardProps) {
  const sparkline = useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return null;
    return renderSparklineSvg(sparklineData, tendenciaPositiva, neutro);
  }, [sparklineData, tendenciaPositiva, neutro]);

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
        destaque
          ? "border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background shadow-xs hover:border-primary/60"
          : "border-border/60 bg-card/90 backdrop-blur-md shadow-2xs hover:border-primary/30 hover:bg-card"
      }`}
    >
      {/* Luz sutil de destaque no topo estilo Uilora */}
      <div className="pointer-events-none absolute -top-12 right-0 size-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

      <CardContent className="relative z-10 p-3.5 sm:p-4 flex flex-col justify-between h-full">
        <div>
          {/* Header com Título e Ícone */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {titulo}
            </span>
            <div
              className={`flex size-6.5 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                destaque
                  ? "bg-primary/20 text-primary shadow-xs shadow-primary/20"
                  : "bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Icone className="size-3.5" />
            </div>
          </div>

          {/* Valor Principal com Números Tabulares + Sparkline integrado */}
          <div className="mt-2 flex items-baseline justify-between gap-1.5">
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className={`font-mono font-extrabold tracking-tight tabular-nums whitespace-nowrap leading-tight ${
                  destaque
                    ? "text-lg xl:text-xl 2xl:text-2xl text-primary"
                    : "text-base xl:text-lg 2xl:text-xl text-foreground"
                }`}
                title={valor}
              >
                {valor}
              </span>
              {subtitulo && (
                <span className="text-[10.5px] text-muted-foreground mt-0.5 whitespace-nowrap truncate">
                  {subtitulo}
                </span>
              )}
            </div>

            {/* Sparkline Visual Compacto */}
            {sparkline && <div className="shrink-0 pl-1">{sparkline}</div>}
          </div>
        </div>

        {/* Rodapé comparativo com Badge */}
        {variacao || valorAnterior ? (
          <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-border/40 pt-2 text-[11px]">
            {variacao && (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold shrink-0 transition-transform group-hover:scale-105 ${
                  neutro
                    ? "bg-muted text-muted-foreground"
                    : tendenciaPositiva
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {neutro ? (
                  <Minus className="size-2.5" />
                ) : tendenciaPositiva ? (
                  <TrendingUp className="size-2.5" />
                ) : (
                  <TrendingDown className="size-2.5" />
                )}
                <span>{variacao}</span>
              </div>
            )}
            {valorAnterior && (
              <span
                className="text-muted-foreground font-medium text-[10.5px] whitespace-nowrap truncate text-right ml-auto"
                title={
                  periodoComparado
                    ? `Comparando com o período anterior (${periodoComparado}): ${valorAnterior}`
                    : `Valor no período anterior: ${valorAnterior}`
                }
              >
                vs. {valorAnterior}
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
