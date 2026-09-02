"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface KpiCardProps {
  titulo: string;
  valor: string;
  variacao?: string;
  tendenciaPositiva?: boolean;
  icone: React.ElementType;
}

export function KpiCard({
  titulo,
  valor,
  variacao,
  tendenciaPositiva = true,
  icone: Icone,
}: KpiCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/60 shadow-xs transition-all duration-200 hover:border-blue-500/30 hover:shadow-md dark:border-border/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-200 group-hover:scale-105 dark:bg-blue-950/60 dark:text-blue-400">
            <Icone className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-muted-foreground truncate">
              {titulo}
            </span>
            <span className="text-xl font-extrabold tracking-tight text-foreground truncate">
              {valor}
            </span>
          </div>
        </div>

        {variacao ? (
          <div
            className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              tendenciaPositiva
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
            }`}
          >
            {tendenciaPositiva ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            <span>{variacao}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
