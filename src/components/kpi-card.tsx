"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline, type TomGrafico } from "@/components/analytics/grafico";

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
  /** Discreto por padrão: o ícone acompanha o rótulo, não compete com o número. */
  icone?: React.ElementType;
  sparklineData?: number[];
}

/**
 * Indicador no padrão Enterprise Analytics.
 *
 * Sem cartão, gradiente ou sombra: uma hairline no topo separa a coluna e o
 * espaço fica com o número. O dado é neutro; a cor só aparece no desvio
 * (verde = favorável, vermelho = alerta), sempre acompanhada do valor do
 * período anterior para explicar a variação.
 */
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
  const tom: TomGrafico = neutro ? "neutro" : tendenciaPositiva ? "positivo" : "negativo";
  const corVariacao = neutro
    ? "text-muted-foreground"
    : tendenciaPositiva
      ? "text-positivo"
      : "text-negativo";
  const IconeVariacao = neutro ? Minus : tendenciaPositiva ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex min-w-0 flex-col justify-between border-t border-linha pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {Icone ? <Icone className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden /> : null}
            <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {titulo}
            </span>
          </div>

          <div
            className={`num mt-1.5 leading-none tracking-tight text-foreground ${
              destaque ? "text-[26px] font-semibold" : "text-[22px] font-semibold"
            }`}
            title={valor}
          >
            {valor}
          </div>

          {subtitulo ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{subtitulo}</p>
          ) : null}
        </div>

        {sparklineData && sparklineData.length > 1 ? (
          // Forma é dado, não julgamento: a sparkline fica neutra e a cor fica no delta.
          <Sparkline dados={sparklineData} tom="neutro" altura={26} />
        ) : null}
      </div>

      {variacao || valorAnterior ? (
        <div className="mt-2.5 flex items-baseline gap-1.5">
          {variacao ? (
            <span
              className={`num inline-flex items-center gap-0.5 text-[11.5px] font-semibold ${corVariacao}`}
              title={
                periodoComparado
                  ? `Variação sobre o período anterior (${periodoComparado})`
                  : "Variação sobre o período anterior"
              }
            >
              <IconeVariacao className="size-3" aria-hidden />
              {variacao}
            </span>
          ) : null}
          {valorAnterior ? (
            <span
              className="num truncate text-[11px] text-muted-foreground"
              title={
                periodoComparado
                  ? `Período anterior (${periodoComparado}): ${valorAnterior}`
                  : `Período anterior: ${valorAnterior}`
              }
            >
              vs. {valorAnterior}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
