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
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
        destaque
          ? "border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm"
          : "border-border/60 bg-card shadow-xs hover:border-primary/30"
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {titulo}
            </span>
            <span
              className={`mt-1 font-mono font-extrabold tracking-tight text-foreground tabular-nums ${
                destaque ? "text-2xl sm:text-3xl text-primary" : "text-xl sm:text-2xl"
              }`}
            >
              {valor}
            </span>
            {subtitulo && (
              <span className="text-[11px] text-muted-foreground mt-0.5">
                {subtitulo}
              </span>
            )}
          </div>

          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
              destaque
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "bg-muted text-foreground/80"
            }`}
          >
            <Icone className="size-5" />
          </div>
        </div>

        {variacao || valorAnterior ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5 text-[11px]">
            {variacao && (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                  neutro
                    ? "bg-muted text-muted-foreground"
                    : tendenciaPositiva
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
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
              <span className="text-muted-foreground font-medium">
                vs. {valorAnterior} ant.
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
