"use client";

import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, DollarSign, FileText, Receipt, Users } from "lucide-react";
import type { VariacoesPeriodoVendas, VariacaoMetrica } from "@/lib/vendas";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { MetricaCard } from "@/components/metrica-card";

interface PanoramaPeriodoProps {
  variacoes: VariacoesPeriodoVendas;
  rotuloPeriodoAnterior?: string;
  compacto?: boolean;
  mostrarClientes?: boolean;
  metricaExtra?: ReactNode;
}

function BadgeVariacao({ variacao }: { variacao: VariacaoMetrica }) {
  if (variacao.neutro) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
        <Minus className="size-3" /> {variacao.texto}
      </span>
    );
  }
  const Icone = variacao.positivo ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
        variacao.positivo
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
      }`}
    >
      <Icone className="size-3" /> {variacao.texto}
    </span>
  );
}

/**
 * Panorama do período: variação das métricas centrais vs. o período
 * anterior equivalente. Cada métrica tem tooltip explicando o que mede.
 */
export function PanoramaPeriodo({
  variacoes,
  rotuloPeriodoAnterior,
  compacto = false,
  mostrarClientes = true,
  metricaExtra,
}: PanoramaPeriodoProps) {
  const semComparativo = !variacoes.temAnterior;

  return (
    <div className="space-y-2">
      {semComparativo ? (
        <p className="text-xs text-muted-foreground">
          Sem vendas no período comparado{rotuloPeriodoAnterior ? ` (${rotuloPeriodoAnterior})` : ""}.
        </p>
      ) : null}

      <section className="rounded-xl border border-border/60 bg-muted/[0.12] p-2.5 sm:p-3">
        {!compacto ? <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Resumo executivo</span>
          <span className="text-[10px] text-muted-foreground/70">4 indicadores comparáveis</span>
        </div> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricaCard
          rotulo="Faturamento"
          definicao="Valor final de todas as vendas do período, com descontos abatidos e frete/seguro/outros somados."
          valor={formatarMoeda(variacoes.faturamento.atual)}
          icone={DollarSign}
          destaque="primario"
          suplemento={semComparativo ? null : <BadgeVariacao variacao={variacoes.faturamento} />}
          rodape={semComparativo ? null : `antes: ${formatarMoeda(variacoes.faturamento.anterior)}`}
        />
        <MetricaCard
          rotulo="Pedidos / NF"
          definicao="Quantidade de notas fiscais emitidas no período — cada documento conta como uma venda."
          valor={formatarNumero(variacoes.notas.atual, 0)}
          icone={Receipt}
          suplemento={semComparativo ? null : <BadgeVariacao variacao={variacoes.notas} />}
          rodape={semComparativo ? null : `antes: ${formatarNumero(variacoes.notas.anterior, 0)}`}
        />
        <MetricaCard
          rotulo="Ticket médio"
          definicao="Faturamento do período ÷ número de notas. Mede o valor médio de cada venda."
          valor={formatarMoeda(variacoes.ticketMedio.atual)}
          icone={FileText}
          suplemento={semComparativo ? null : <BadgeVariacao variacao={variacoes.ticketMedio} />}
          rodape={semComparativo ? null : `antes: ${formatarMoeda(variacoes.ticketMedio.anterior)}`}
        />
        {mostrarClientes ? (
          <MetricaCard
            rotulo="Clientes ativos"
            definicao="Número de clientes distintos que compraram no período (inclui consumidor de balcão)."
            valor={formatarNumero(variacoes.clientes.atual, 0)}
            icone={Users}
            suplemento={semComparativo ? null : <BadgeVariacao variacao={variacoes.clientes} />}
            rodape={semComparativo ? null : `antes: ${formatarNumero(variacoes.clientes.anterior, 0)}`}
          />
        ) : null}
        {metricaExtra}
        </div>
      </section>
    </div>
  );
}
