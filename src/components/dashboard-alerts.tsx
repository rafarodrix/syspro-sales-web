"use client";

import Link from "next/link";
import { BellRing, ChevronDown, CircleAlert, Info } from "lucide-react";
import type { AlertaGerencial } from "@/lib/alertas-gerenciais";
import type { Periodo } from "@/lib/periodo";
import type { ModoComparacao } from "@/lib/periodo-comparacao";

export function DashboardAlerts({
  alertas,
  empresaId,
  periodo,
  periodoComparacao,
  modoComparacao,
}: {
  alertas: AlertaGerencial[];
  empresaId: string;
  periodo: Periodo;
  periodoComparacao?: Periodo;
  modoComparacao: ModoComparacao;
}) {
  if (!alertas.length) return null;

  const atencoes = alertas.filter((item) => item.nivel === "atencao").length;

  return (
    <details className="group rounded-lg border border-border/60 bg-card shadow-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 marker:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BellRing className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground">
              Alertas gerenciais
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {alertas.length} sinal{alertas.length === 1 ? "" : "is"}
              {atencoes ? ` · ${atencoes} requer${atencoes === 1 ? "" : "em"} atenção` : ""}
            </div>
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="divide-y divide-border/60 border-t border-border/60">
        {alertas.map((alerta) => {
          const Icon = alerta.nivel === "atencao" ? CircleAlert : Info;
          const params = new URLSearchParams({
            aba: alerta.relatorio,
            empresa: empresaId,
            periodoInicial: periodo.inicial,
            periodoFinal: periodo.final,
            comparacao: modoComparacao,
            ...(modoComparacao === "personalizado" && periodoComparacao
              ? {
                  comparacaoInicial: periodoComparacao.inicial,
                  comparacaoFinal: periodoComparacao.final,
                }
              : {}),
          });
          return (
            <Link
              key={alerta.id}
              href={`/relatorios?${params.toString()}`}
              className="flex items-start gap-2.5 px-3.5 py-3 transition-colors hover:bg-muted/40"
            >
              <Icon
                className={
                  alerta.nivel === "atencao"
                    ? "mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    : "mt-0.5 size-4 shrink-0 text-primary"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground">
                  {alerta.titulo}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {alerta.detalhe}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-medium text-primary">
                Ver análise
              </span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
