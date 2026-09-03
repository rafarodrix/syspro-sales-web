"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  variacao?: string;
  valorAnterior?: string;
  tendenciaPositiva?: boolean;
  neutro?: boolean;
  destaque?: boolean;
  icone: React.ElementType;
}

export function KpiCard({
  titulo,
  valor,
  subtitulo,
  variacao,
  valorAnterior,
  tendenciaPositiva = true,
  neutro = false,
  destaque = false,
  icone: Icone,
}: KpiCardProps) {
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

      <CardContent className="relative z-10 p-4 flex flex-col justify-between h-full">
        <div>
          {/* Header com Título e Ícone */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {titulo}
            </span>
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                destaque
                  ? "bg-primary/20 text-primary shadow-xs shadow-primary/20"
                  : "bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Icone className="size-3.5" />
            </div>
          </div>

          {/* Valor Principal com Números Tabulares */}
          <div className="mt-2.5 flex flex-col min-w-0">
            <span
              className={`font-mono font-extrabold tracking-tight tabular-nums truncate ${
                destaque
                  ? "text-xl sm:text-2xl text-primary"
                  : "text-lg sm:text-xl text-foreground"
              }`}
              title={valor}
            >
              {valor}
            </span>
            {subtitulo && (
              <span className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {subtitulo}
              </span>
            )}
          </div>
        </div>

        {/* Rodapé comparativo com Badge */}
        {variacao || valorAnterior ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px]">
            {variacao && (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition-transform group-hover:scale-105 ${
                  neutro
                    ? "bg-muted text-muted-foreground"
                    : tendenciaPositiva
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {neutro ? (
                  <Minus className="size-3" />
                ) : tendenciaPositiva ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                <span>{variacao}</span>
              </div>
            )}
            {valorAnterior && (
              <span className="text-muted-foreground font-medium text-[10.5px]">
                vs. {valorAnterior} ant.
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
