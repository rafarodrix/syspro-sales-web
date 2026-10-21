"use client";

import { useMemo, useState } from "react";
import { ReportTable } from "./report-table";
import { FiltroRelatorio } from "./filtro-relatorio";
import { Badge } from "@/components/ui/badge";
import { Tendencia } from "./ui/tendencia";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import {
  compararDimensao,
  ordenarComparativo,
  resumirComparativo,
  ORDENACOES_COMPARATIVO,
  type ItemDimensaoFaturamento,
  type OrdenacaoComparativo,
} from "@/lib/comparativo-dimensao";

interface VisaoComparativoDimensaoProps {
  /** Rótulo da dimensão comparada (Departamento, UF, Forma de pagamento...). */
  rotuloDimensao: string;
  itensAtuais: ItemDimensaoFaturamento[];
  itensAnteriores: ItemDimensaoFaturamento[];
  rotuloPeriodoAnterior?: string;
  /**
   * Comparação disponível? Quando falso, a visão explica que ainda não há
   * período anterior consultado, em vez de mostrar uma tabela vazia.
   */
  comparacaoDisponivel: boolean;
}

/**
 * Comparativo de uma dimensão de vendas contra o período anterior equivalente.
 * Mostra crescimento em valor, variação percentual e mudança de participação
 * (mix) — o que a tabela de participação simples não responde.
 */
export function VisaoComparativoDimensao({
  rotuloDimensao,
  itensAtuais,
  itensAnteriores,
  rotuloPeriodoAnterior,
  comparacaoDisponivel,
}: VisaoComparativoDimensaoProps) {
  const [ordenacao, setOrdenacao] = useState<OrdenacaoComparativo>("impacto");

  const linhas = useMemo(
    () => compararDimensao(itensAtuais, itensAnteriores),
    [itensAtuais, itensAnteriores],
  );
  const resumo = useMemo(() => resumirComparativo(linhas), [linhas]);
  const ordenadas = useMemo(() => ordenarComparativo(linhas, ordenacao), [linhas, ordenacao]);

  if (!comparacaoDisponivel) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecione um período de comparação para ver o que cresceu, o que caiu e como mudou o mix de{" "}
        {rotuloDimensao.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <MetricsStrip
        itens={[
          {
            rotulo: "Faturamento atual",
            valor: formatarMoeda(resumo.totalAtual),
            detalhe: `anterior: ${formatarMoeda(resumo.totalAnterior)}`,
            definicao: "Faturamento total do período consultado e do período de comparação.",
          },
          {
            rotulo: "Variação total",
            valor: formatarMoeda(resumo.variacaoTotal),
            detalhe:
              resumo.totalAnterior > 0
                ? `${formatarPercentual((resumo.variacaoTotal / resumo.totalAnterior) * 100, 1)} vs período anterior`
                : undefined,
            attention: resumo.variacaoTotal < 0,
            definicao: "Diferença de faturamento entre o período atual e o anterior.",
          },
          {
            rotulo: "Cresceram",
            valor: formatarNumero(resumo.cresceram, 0),
            detalhe: `${formatarNumero(resumo.cairam, 0)} caíram · ${formatarNumero(resumo.novos, 0)} novos`,
            definicao:
              "Quantidade de dimensões com faturamento maior que no período anterior (inclui as que não existiam antes).",
          },
          {
            rotulo: "Maior alta",
            valor: resumo.maiorAlta?.nome ?? "—",
            detalhe: resumo.maiorAlta ? formatarMoeda(resumo.maiorAlta.variacaoValor) : undefined,
            definicao: "Dimensão que mais somou faturamento no período atual.",
          },
          {
            rotulo: "Maior queda",
            valor: resumo.maiorQueda?.nome ?? "—",
            detalhe: resumo.maiorQueda ? formatarMoeda(resumo.maiorQueda.variacaoValor) : undefined,
            attention: Boolean(resumo.maiorQueda),
            definicao: "Dimensão que mais perdeu faturamento em relação ao período anterior.",
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <FiltroRelatorio
          rotulo="Ordenar por"
          valor={ordenacao}
          opcoes={ORDENACOES_COMPARATIVO.map((item) => ({
            valor: item.valor,
            rotulo: item.rotulo,
          }))}
          onChange={(valor) => setOrdenacao(valor as OrdenacaoComparativo)}
        />
        <span className="text-xs text-muted-foreground">
          {ordenadas.length} {rotuloDimensao.toLowerCase()}(s)
          {rotuloPeriodoAnterior ? ` · comparado com ${rotuloPeriodoAnterior}` : ""}
        </span>
      </div>

      <ReportTable
        data={ordenadas}
        rowKey={(linha) => linha.nome}
        label={rotuloDimensao.toLowerCase()}
        columns={[
          {
            id: "nome",
            header: <>{rotuloDimensao}</>,
            kind: "name",
            value: (linha) => linha.nome,
            cell: (linha) => (
              <span className="flex items-center gap-2">
                {linha.nome}
                {linha.novo ? <Badge variant="secondary">novo</Badge> : null}
              </span>
            ),
          },
          {
            id: "atual",
            header: <>Atual</>,
            kind: "currency",
            value: (linha) => linha.atual,
            cell: (linha) => <>{formatarMoeda(linha.atual)}</>,
          },
          {
            id: "anterior",
            header: <>Anterior</>,
            kind: "currency",
            value: (linha) => linha.anterior,
            cell: (linha) => <>{formatarMoeda(linha.anterior)}</>,
          },
          {
            id: "variacao",
            header: <>Variação</>,
            kind: "currency",
            value: (linha) => linha.variacaoValor,
            cell: (linha) => (
              <Tendencia
                valor={linha.variacaoValor}
                percentual={linha.variacaoPercentual}
                novo={linha.novo}
              />
            ),
          },
          {
            id: "participacaoAtual",
            header: <>Participação atual</>,
            kind: "percent",
            value: (linha) => linha.participacaoAtual,
            cell: (linha) => <>{formatarPercentual(linha.participacaoAtual, 1)}</>,
          },
          {
            id: "participacaoAnterior",
            header: <>Participação anterior</>,
            kind: "percent",
            value: (linha) => linha.participacaoAnterior,
            cell: (linha) => <>{formatarPercentual(linha.participacaoAnterior, 1)}</>,
          },
          {
            id: "variacaoParticipacao",
            header: <>Δ participação</>,
            kind: "percent",
            value: (linha) => linha.variacaoParticipacao,
            cell: (linha) => (
              <span
                className={
                  linha.variacaoParticipacao > 0
                    ? "font-mono text-emerald-700 dark:text-emerald-400"
                    : linha.variacaoParticipacao < 0
                      ? "font-mono text-rose-700 dark:text-rose-400"
                      : "font-mono text-muted-foreground"
                }
              >
                {linha.variacaoParticipacao > 0 ? "+" : ""}
                {formatarPercentual(linha.variacaoParticipacao, 1)}
              </span>
            ),
          },
        ]}
      />

      <p className="text-xs text-muted-foreground">
        Variação compara com o período anterior equivalente. Δ participação é a diferença em pontos
        percentuais do peso da dimensão no faturamento total: positivo significa que ela ganhou espaço
        no mix, mesmo que o valor absoluto tenha caído.
      </p>
    </div>
  );
}
