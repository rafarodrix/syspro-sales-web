"use client";

import { useMemo } from "react";

import { GraficoBarras } from "@/components/analytics/grafico";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { FeedbackState } from "@/components/feedback-state";
import { KpiCard } from "@/components/kpi-card";
import { ReportTable } from "@/components/relatorios/report-table";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { analisarFornecedores, rotuloConcentracao } from "@/lib/analise-fornecedores";
import type { VendaComEmpresa, VendaProduto } from "@/lib/syspro-api";

/**
 * Aba Fornecedores do Dashboard.
 *
 * Responde: quanto de cada fornecedor está vendendo, qual a margem que ele
 * entrega, quanto do faturamento depende dos 5 maiores e onde há risco de
 * concentração. O fornecedor vem do próprio item de venda.
 */
export function AbaFornecedores({
  vendas,
  carregando,
}: {
  vendas: (VendaProduto | VendaComEmpresa)[];
  carregando?: boolean;
}) {
  const { linhas, resumo } = useMemo(() => analisarFornecedores(vendas), [vendas]);

  const top10 = useMemo(
    () =>
      linhas
        .filter((linha) => linha.fornecedor.toUpperCase() !== "SEM FORNECEDOR INFORMADO")
        .slice(0, 10)
        .map((linha) => ({
          rotulo: linha.fornecedor.length > 30 ? `${linha.fornecedor.slice(0, 29)}…` : linha.fornecedor,
          valor: linha.valorLiquido,
        })),
    [linhas],
  );

  const concentracao = rotuloConcentracao(resumo.concentracaoHhi);
  // Base cujo SysproServer ainda não devolve fornecedor: nada a analisar.
  const somenteSemFornecedor = vendas.length > 0 && resumo.fornecedoresAtivos === 0;

  if (somenteSemFornecedor) {
    return (
      <FeedbackState
        variant="empty"
        title="Esta empresa ainda não devolve fornecedor"
        description={`Os ${formatarNumero(resumo.itensSemFornecedor, 0)} itens vendidos no período vieram sem fornecedor na rota produto/venda. Atualize o SysproServer desta base com a versão que envia fornecedor_codigo e fornecedor_nome — a análise passa a funcionar sem mudança no portal.`}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores de fornecedores"
      >
        <KpiCard
          titulo="Venda total"
          valor={formatarMoeda(resumo.vendaTotal)}
          subtitulo="Vendas líquidas do período, por fornecedor do produto"
          icone={undefined}
        />
        <KpiCard
          titulo="Fornecedores ativos"
          valor={formatarNumero(resumo.fornecedoresAtivos, 0)}
          subtitulo="Com pelo menos uma venda no período"
        />
        <KpiCard
          titulo="Top 5 no faturamento"
          valor={formatarPercentual(resumo.participacaoTop5, 1)}
          subtitulo={`Concentração ${concentracao.toLowerCase()} · HHI ${formatarNumero(resumo.concentracaoHhi, 0)}`}
          tendenciaPositiva={resumo.participacaoTop5 < 60}
          neutro={resumo.participacaoTop5 >= 60 && resumo.participacaoTop5 < 75}
        />
        <KpiCard
          titulo="Margem bruta"
          valor={formatarPercentual(resumo.margemGeral, 1)}
          subtitulo="Sobre as vendas líquidas, só onde há custo de reposição"
        />
      </section>

      {resumo.itensSemFornecedor > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {formatarNumero(resumo.itensSemFornecedor, 0)} item(ns) sem fornecedor no retorno da API —
          aparecem agrupados em “Sem fornecedor informado” e ficam fora do cálculo de concentração.
        </p>
      ) : null}

      {top10.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Top 10 fornecedores por venda líquida
          </h3>
          <GraficoBarras
            dados={top10}
            rotulo="Venda líquida"
            altura={Math.max(160, top10.length * 30)}
          />
        </section>
      ) : null}

      <ReportTable
        label="fornecedores"
        caption="Vendas por fornecedor do produto"
        data={linhas}
        rowKey={(linha) => linha.fornecedor}
        stickyFirst
        exportObservacoes="Fornecedor do produto informado pela rota produto/venda. Margem considera apenas itens com custo de reposição informado."
        columns={[
          {
            id: "fornecedor",
            header: <>Fornecedor</>,
            kind: "name",
            value: (linha) => linha.fornecedor,
            cell: (linha) => <span className="block truncate font-medium">{linha.fornecedor}</span>,
          },
          {
            id: "venda",
            header: <span title="Valor bruto dos itens vendidos">Venda bruta</span>,
            kind: "currency",
            value: (linha) => linha.valorVendido,
            cell: (linha) => <>{formatarMoeda(linha.valorVendido)}</>,
          },
          {
            id: "descontos",
            header: <span title="Descontos concedidos nos itens deste fornecedor">Descontos</span>,
            kind: "currency",
            value: (linha) => linha.descontos,
            cell: (linha) => <>{formatarMoeda(linha.descontos)}</>,
          },
          {
            id: "acrescimos",
            header: <span title="Frete, seguro e outros acréscimos somados ao item">Acréscimos</span>,
            kind: "currency",
            value: (linha) => linha.acrescimos,
            cell: (linha) => <>{formatarMoeda(linha.acrescimos)}</>,
          },
          {
            id: "liquido",
            header: <>Venda líquida</>,
            kind: "currency",
            value: (linha) => linha.valorLiquido,
            cell: (linha) => <>{formatarMoeda(linha.valorLiquido)}</>,
          },
          {
            id: "lucro",
            header: <>Lucro bruto</>,
            kind: "currency",
            value: (linha) => linha.lucro,
            cell: (linha) => (
              <span className={linha.lucro < 0 ? "font-semibold text-negativo" : ""}>
                {formatarMoeda(linha.lucro)}
              </span>
            ),
          },
          {
            id: "margem",
            header: <>Margem</>,
            kind: "percent",
            value: (linha) => linha.margem,
            cell: (linha) => (
              <span className={linha.margem !== null && linha.margem < 0 ? "font-semibold text-negativo" : ""}>
                {linha.margem === null ? "—" : formatarPercentual(linha.margem, 1)}
              </span>
            ),
          },
          {
            id: "skus",
            header: <>SKUs</>,
            kind: "number",
            value: (linha) => linha.skus,
            cell: (linha) => <>{formatarNumero(linha.skus, 0)}</>,
          },
          {
            id: "clientes",
            header: <>Clientes</>,
            kind: "number",
            value: (linha) => linha.clientes,
            cell: (linha) => <>{formatarNumero(linha.clientes, 0)}</>,
          },
          {
            id: "participacao",
            header: <>Participação</>,
            kind: "percent",
            value: (linha) => linha.participacao,
            cell: (linha) => <>{formatarPercentual(linha.participacao, 1)}</>,
          },
        ]}
        rodape={(linhasRodape) => (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[11px] text-muted-foreground">
            <span>{formatarNumero(linhasRodape.length, 0)} fornecedor(es)</span>
            <span>
              Venda líquida:{" "}
              <strong className="num text-foreground">
                {formatarMoeda(linhasRodape.reduce((total, linha) => total + linha.valorLiquido, 0))}
              </strong>
            </span>
            <span>
              Lucro:{" "}
              <strong className="num text-foreground">
                {formatarMoeda(linhasRodape.reduce((total, linha) => total + linha.lucro, 0))}
              </strong>
            </span>
          </div>
        )}
      />

      {!carregando && linhas.length === 0 ? (
        <MetricsStrip
          itens={[
            {
              rotulo: "Sem dados",
              valor: "—",
              detalhe: "Nenhuma venda no período consultado",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
