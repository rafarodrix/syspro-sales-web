"use client";

import { ArrowDownRight, ArrowUpRight, ChevronDown, CircleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/formatters";
import type { ItemContribuicaoVariacao } from "@/lib/vendas";

export interface DiagnosticoMetrica {
  label: string;
  value: string;
  detail?: string;
  attention?: boolean;
}

export function ReportDiagnostics({
  titulo = "Diagnóstico do período",
  metricas = [],
  crescimento = [],
  queda = [],
}: {
  titulo?: string;
  metricas?: DiagnosticoMetrica[];
  crescimento?: ItemContribuicaoVariacao[];
  queda?: ItemContribuicaoVariacao[];
}) {
  if (!metricas.length && !crescimento.length && !queda.length) return null;

  const sinais = metricas.length + crescimento.length + queda.length;

  return (
    <details className="group rounded-lg border border-border/60 bg-muted/[0.06]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-foreground marker:hidden">
        <span>{titulo}</span>
        <span className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          {sinais} sinal{sinais === 1 ? "" : "is"}
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <section className="space-y-2 border-t border-border/60 p-3" aria-label={titulo}>

      {metricas.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metricas.map((item) => (
            <Card
              key={item.label}
              className={
                item.attention
                  ? "border-amber-500/30 bg-amber-500/5 shadow-none"
                  : "border-border/60 bg-muted/10 shadow-none"
              }
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.attention ? <CircleAlert className="size-3" /> : null}
                  {item.label}
                </div>
                <div className="mt-1 font-mono text-base font-extrabold tabular-nums text-foreground">
                  {item.value}
                </div>
                {item.detail ? (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {item.detail}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {crescimento.length || queda.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <DriverList
            titulo="Quem mais adicionou receita"
            itens={crescimento}
            positivo
          />
          <DriverList titulo="Quem mais retirou receita" itens={queda} />
        </div>
      ) : null}
      </section>
    </details>
  );
}

function DriverList({
  titulo,
  itens,
  positivo = false,
}: {
  titulo: string;
  itens: ItemContribuicaoVariacao[];
  positivo?: boolean;
}) {
  const Icon = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-foreground">
        <Icon
          className={
            positivo
              ? "size-3.5 text-emerald-600 dark:text-emerald-400"
              : "size-3.5 text-rose-600 dark:text-rose-400"
          }
        />
        {titulo}
      </div>
      {itens.length ? (
        <ol className="space-y-1.5">
          {itens.map((item) => (
            <li
              key={item.chave}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-muted-foreground" title={item.nome}>
                {item.nome}
              </span>
              <span
                className={
                  positivo
                    ? "shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    : "shrink-0 font-mono font-bold text-rose-600 dark:text-rose-400"
                }
              >
                {positivo ? "+" : ""}
                {formatarMoeda(item.diferenca)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Nenhum movimento relevante neste recorte.
        </p>
      )}
    </div>
  );
}
