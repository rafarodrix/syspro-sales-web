"use client";

import type { ReactNode } from "react";
import type { VariacoesPeriodoVendas, VariacaoMetrica } from "@/lib/vendas";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { MetricsStrip, type MetricsStripItem } from "@/components/analytics/metrics-strip";

interface PanoramaPeriodoProps {
  variacoes: VariacoesPeriodoVendas;
  rotuloPeriodoAnterior?: string;
  compacto?: boolean;
  mostrarClientes?: boolean;
  /** Indicadores extras exibidos na mesma faixa (ex.: devoluções, descontos). */
  itensExtra?: MetricsStripItem[];
  metricaExtra?: ReactNode;
}

/** Texto curto da variação para a faixa de indicadores. */
function textoVariacao(variacao: VariacaoMetrica): string | null {
  if (variacao.neutro || variacao.semBase) return null;
  return variacao.texto;
}

/**
 * Panorama do período: faixa compacta (mesmo padrão da análise de compras) com a
 * variação das métricas centrais vs. o período anterior equivalente.
 * Cada item explica o cálculo no tooltip.
 */
export function PanoramaPeriodo({
  variacoes,
  rotuloPeriodoAnterior,
  compacto = false,
  mostrarClientes = true,
  itensExtra,
  metricaExtra,
}: PanoramaPeriodoProps) {
  const semComparativo = !variacoes.temAnterior;

  const itens: MetricsStripItem[] = [
    {
      rotulo: "Faturamento",
      valor: formatarMoeda(variacoes.faturamento.atual),
      detalhe: semComparativo
        ? "sem período comparado"
        : [textoVariacao(variacoes.faturamento), `antes: ${formatarMoeda(variacoes.faturamento.anterior)}`]
            .filter(Boolean)
            .join(" · "),
      definicao:
        "Valor final de todas as vendas do período, com descontos abatidos e frete/seguro/outros somados.",
    },
    {
      rotulo: "Pedidos / NF",
      valor: formatarNumero(variacoes.notas.atual, 0),
      detalhe: semComparativo
        ? undefined
        : [textoVariacao(variacoes.notas), `antes: ${formatarNumero(variacoes.notas.anterior, 0)}`]
            .filter(Boolean)
            .join(" · "),
      definicao: "Quantidade de notas fiscais emitidas no período — cada documento conta como uma venda.",
    },
    {
      rotulo: "Ticket médio",
      valor: formatarMoeda(variacoes.ticketMedio.atual),
      detalhe: semComparativo
        ? undefined
        : [textoVariacao(variacoes.ticketMedio), `antes: ${formatarMoeda(variacoes.ticketMedio.anterior)}`]
            .filter(Boolean)
            .join(" · "),
      definicao: "Faturamento do período ÷ número de notas. Mede o valor médio de cada venda.",
    },
    {
      rotulo: "Margem bruta",
      valor:
        variacoes.coberturaCustoAtual > 0
          ? formatarPercentual(variacoes.margemBruta.atual, 1)
          : "—",
      detalhe:
        variacoes.coberturaCustoAtual > 0
          ? `lucro ${formatarMoeda(variacoes.lucroBruto.atual)} · cobertura ${formatarPercentual(variacoes.coberturaCustoAtual, 1)}`
          : "custos de reposição não informados",
      definicao:
        "Receita dos itens com custo informado menos o custo de reposição. Itens sem custo não entram no cálculo.",
    },
  ];

  if (mostrarClientes) {
    itens.push({
      rotulo: "Clientes identificados",
      valor: formatarNumero(variacoes.clientes.atual, 0),
      detalhe: semComparativo
        ? undefined
        : [textoVariacao(variacoes.clientes), `antes: ${formatarNumero(variacoes.clientes.anterior, 0)}`]
            .filter(Boolean)
            .join(" · "),
      definicao:
        "Clientes distintos identificados que compraram no período. Consumidores genéricos de balcão são excluídos para não distorcer a comparação comercial.",
    });
  }

  if (itensExtra?.length) itens.push(...itensExtra);

  return (
    <div className="space-y-2">
      {semComparativo ? (
        <p className="text-xs text-muted-foreground">
          Sem vendas no período comparado{rotuloPeriodoAnterior ? ` (${rotuloPeriodoAnterior})` : ""}.
        </p>
      ) : null}

      {!compacto ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Resumo executivo
          </span>
        </div>
      ) : null}

      <MetricsStrip itens={itens} />
      {metricaExtra ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metricaExtra}</div> : null}
    </div>
  );
}
