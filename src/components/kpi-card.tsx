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
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div>
          {/* Header com Título e Ícone sem colisão */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {titulo}
            </span>
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${
                destaque
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icone className="size-3.5" />
            </div>
          </div>

          {/* Valor com 100% da largura disponível */}
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

        {/* Rodapé comparativo */}
        {variacao || valorAnterior ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px]">
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
