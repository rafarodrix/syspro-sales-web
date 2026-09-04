"use client";

import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from "lucide-react";
import type { VariacoesPeriodoVendas, VariacaoMetrica } from "@/lib/vendas";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";
import { TermoExplicado } from "@/components/relatorio-guia";

interface PanoramaPeriodoProps {
  variacoes: VariacoesPeriodoVendas;
  rotuloPeriodoAnterior?: string;
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
export function PanoramaPeriodo({ variacoes, rotuloPeriodoAnterior }: PanoramaPeriodoProps) {
  const semComparativo = !variacoes.temAnterior;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <ArrowLeftRight className="size-3.5" />
        Variação vs. período anterior
        {semComparativo ? (
          <span className="normal-case font-semibold text-muted-foreground/70">
            — clique em consultar para carregar também o período anterior equivalente
          </span>
        ) : (
          <span className="normal-case font-semibold text-muted-foreground/70">
            {rotuloPeriodoAnterior ? `(base: ${rotuloPeriodoAnterior})` : "(período de mesma duração imediatamente anterior)"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Faturamento"
            definicao="Valor final de todas as vendas do período, com descontos abatidos e frete/seguro/outros somados."
          />
          <div className="mt-1.5 font-mono text-lg font-extrabold text-foreground">
            {formatarMoeda(variacoes.faturamento.atual)}
          </div>
          <div className="mt-1">{semComparativo ? null : <BadgeVariacao variacao={variacoes.faturamento} />}</div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Pedidos / NF"
            definicao="Quantidade de notas fiscais emitidas no período — cada documento conta como uma venda."
          />
          <div className="mt-1.5 font-mono text-lg font-extrabold text-foreground">
            {formatarNumero(variacoes.notas.atual, 0)}
          </div>
          <div className="mt-1">{semComparativo ? null : <BadgeVariacao variacao={variacoes.notas} />}</div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Ticket médio"
            definicao="Faturamento do período ÷ número de notas. Mede o valor médio de cada venda."
          />
          <div className="mt-1.5 font-mono text-lg font-extrabold text-foreground">
            {formatarMoeda(variacoes.ticketMedio.atual)}
          </div>
          <div className="mt-1">{semComparativo ? null : <BadgeVariacao variacao={variacoes.ticketMedio} />}</div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <TermoExplicado
            termo="Clientes ativos"
            definicao="Número de clientes distintos que compraram no período (inclui consumidor de balcão)."
          />
          <div className="mt-1.5 font-mono text-lg font-extrabold text-foreground">
            {formatarNumero(variacoes.clientes.atual, 0)}
          </div>
          <div className="mt-1">{semComparativo ? null : <BadgeVariacao variacao={variacoes.clientes} />}</div>
        </div>
      </div>
    </div>
  );
}
