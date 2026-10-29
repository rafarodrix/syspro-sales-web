"use client";

import { useMemo, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { ActionMetricCard } from "@/components/analytics/action-metric-card";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { StatusRelatorio } from "./relatorios/ui/status-relatorio";
import { SecaoTitulo } from "./relatorios/ui/secao-titulo";
import { FiltroRelatorio } from "./relatorios/filtro-relatorio";
import { DataFilterBar } from "@/components/data-filter-bar";
import { ExportDropdown } from "@/components/export-dropdown";
import { ReportTable } from "./relatorios/report-table";
import type { ItemRelatorioCompras } from "@/lib/relatorio-compras";
import { ClasseBadge } from "./relatorios/ui/classe-badge";
import { GlossarioRelatorio, GUIAS_RELATORIOS } from "@/components/relatorio-guia";
import {
  DateRangeFilter,
  periodoUltimos90Dias,
  salvarPeriodoCookie,
  type Periodo,
} from "@/components/date-range-filter";
import { FeedbackState } from "@/components/feedback-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
import { formatarDataInputParaBR } from "@/lib/vendas";
import { exportarParaCSV } from "@/lib/exportar-csv";
import { COLUNAS_EXPORTACAO_COMPRAS, montarLinhasExportacaoCompras } from "@/lib/exportar-compras";
import {
  CRITERIOS_ORDENACAO_COMPRAS,
  SITUACOES_COMPRA,
  custoSugestaoCompra,
  ordenarItensCompras,
  resumirDecisaoCompra,
  rotuloSituacao,
  situacaoEstoque,
  sugestaoCompra,
  type CriterioOrdenacaoCompras,
  type SituacaoCompra,
} from "@/lib/compras-compra";
import type { ClasseCurvaCompras, RelatorioCompras } from "@/lib/relatorio-compras";

const RELATORIO_VAZIO: RelatorioCompras = {
  itens: [],
  resumo: {
    totalProdutos: 0,
    quantidadeVendida: 0,
    quantidadeDevolvida: 0,
    quantidadeLiquidaReal: 0,
    demandaLiquida: 0,
    taxaDevolucao: 0,
    valorVendido: 0,
    valorDevolvido: 0,
    valorVendaLiquida: 0,
    taxaDevolucaoValor: 0,
    produtosSemSaldo: 0,
    produtosSemSaldoLocalizado: 0,
    custoTotalMercadorias: 0,
    margemBruta: 0,
    margemBrutaPercentual: 0,
    coberturaCusto: 0,
    custoEstoqueAquisicao: 0,
    custoEstoqueReposicao: 0,
  },
};

/** Faixa compacta de métricas — evita uma grade de cards para números de contexto. */

function badgeSituacao(situacao: SituacaoCompra) {
  if (situacao === "ruptura") return "destructive" as const;
  if (situacao === "critica") return "destructive" as const;
  if (situacao === "abaixo") return "secondary" as const;
  if (situacao === "saudavel") return "default" as const;
  return "outline" as const;
}

export function ComprasView({
  empresaId,
  empresaNome,
  coberturaAlvoInicial,
  grupoEstoquePadrao = "GERAL",
}: {
  empresaId: string;
  empresaNome: string;
  coberturaAlvoInicial: number;
  
  grupoEstoquePadrao?: string;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoUltimos90Dias());
  const [periodoConsultado, setPeriodoConsultado] = useState<Periodo | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioCompras>(RELATORIO_VAZIO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [curva, setCurva] = useState<"todas" | ClasseCurvaCompras>("todas");
  const [marca, setMarca] = useState("todas");
  const [situacao, setSituacao] = useState<"todas" | SituacaoCompra>("todas");
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacaoCompras>("demanda");
  const [alvoDias, setAlvoDias] = useState(coberturaAlvoInicial);
  const opcoesCobertura = useMemo(
    () => [...new Set([coberturaAlvoInicial, 15, 30, 45, 60, 90])].sort((a, b) => a - b),
    [coberturaAlvoInicial],
  );


  const marcas = useMemo(() => {
    const conjunto = new Set<string>();
    for (const item of relatorio.itens) {
      const nome = item.marca?.trim();
      if (nome) conjunto.add(nome);
    }
    return [...conjunto].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [relatorio.itens]);

  async function consultar(proximoPeriodo: Periodo = periodo) {
    if (!empresaId) {
      toast.error("Selecione uma empresa.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/relatorios/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: proximoPeriodo.inicial,
          dtFinal: proximoPeriodo.final,
          forcarAtualizacao: true,
        }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as RelatorioCompras & {
        error?: string;
      };
      if (!resposta.ok) throw new Error(dados.error || "Erro ao gerar o relatório.");

      setRelatorio(dados);
      setPeriodoConsultado({ ...proximoPeriodo });
      salvarPeriodoCookie(proximoPeriodo);
      toast.success(`${dados.resumo.totalProdutos} produto(s) analisado(s).`);
    } catch (causa) {
      const mensagem = causa instanceof Error ? causa.message : "Erro ao gerar o relatório.";
      setErro(mensagem);
      setRelatorio(RELATORIO_VAZIO);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = relatorio.itens.filter((item) => {
      if (curva !== "todas" && item.curva !== curva) return false;
      if (marca !== "todas" && (item.marca ?? "").trim() !== marca) return false;
      if (situacao !== "todas" && situacaoEstoque(item, alvoDias) !== situacao) return false;
      if (!termo) return true;
      return (
        item.codigo.toLowerCase().includes(termo) ||
        item.produto.toLowerCase().includes(termo) ||
        (item.marca ?? "").toLowerCase().includes(termo)
      );
    });
    return ordenarItensCompras(filtrados, ordenacao, alvoDias);
  }, [busca, curva, marca, situacao, ordenacao, alvoDias, relatorio.itens]);

  const resumoDecisao = useMemo(
    () => resumirDecisaoCompra(itensFiltrados, alvoDias),
    [itensFiltrados, alvoDias],
  );

  const totais = useMemo(() => {
    const somar = (valor: (item: (typeof itensFiltrados)[number]) => number | null | undefined) =>
      itensFiltrados.reduce((total, item) => total + (valor(item) ?? 0), 0);
    const valorVendaLiquida = somar((item) => item.valorVendaLiquida);
    const custoMercadorias = somar((item) => item.custoTotalMercadorias);
    return {
      quantidadeVendida: somar((item) => item.quantidadeVendida),
      quantidadeDevolvida: somar((item) => item.quantidadeDevolvida),
      demandaLiquida: somar((item) => item.demandaLiquida),
      estoqueAtual: somar((item) => item.estoqueAtual),
      custoEstoqueAquisicao: somar((item) => item.custoEstoqueAquisicao),
      custoEstoqueReposicao: somar((item) => item.custoEstoqueReposicao),
      valorVendido: somar((item) => item.valorVendido),
      valorDevolvido: somar((item) => item.valorDevolvido),
      valorVendaLiquida,
      sugestaoUnidades: somar((item) => sugestaoCompra(item, alvoDias)),
      margemPercentual: valorVendaLiquida > 0
        ? ((valorVendaLiquida - custoMercadorias) / valorVendaLiquida) * 100
        : null,
    };
  }, [itensFiltrados, alvoDias]);

  function exportarExcel() {
    if (itensFiltrados.length === 0) {
      toast.error("Nada para exportar com os filtros atuais.");
      return;
    }
    const periodo = periodoConsultado
      ? `${periodoConsultado.inicial}_a_${periodoConsultado.final}`
      : new Date().toISOString().slice(0, 10);
    exportarParaCSV(
      `analise-compras-${empresaNome.replace(/[^\w-]+/g, "-").toLowerCase()}-${periodo}`,
      [...COLUNAS_EXPORTACAO_COMPRAS],
      montarLinhasExportacaoCompras(itensFiltrados, alvoDias),
    );
    toast.success(`${itensFiltrados.length} produto(s) exportado(s).`);
  }

  // paginação agora é responsabilidade do ReportTable

  return (
    <div className="flex flex-col gap-6">
      <AnalysisQueryCard
        icon={ShoppingBasket}
        title="Análise de Compras"
        description={`Vendas, devoluções de venda EDV e estoque atual por produto em ${empresaNome}.`}
        footer={`Cobertura alvo inicial configurada para esta empresa: ${coberturaAlvoInicial} dias.`}
      >
        <DateRangeFilter
          value={periodo}
          onChange={setPeriodo}
          onConsultar={consultar}
          loading={loading}
        />
      </AnalysisQueryCard>

      {erro ? (
        <FeedbackState
          variant="error"
          title="Não foi possível gerar a análise"
          description={erro}
          onRetry={() => consultar()}
        />
      ) : null}

      {periodoConsultado ? (
        <section className="space-y-3">
          <SecaoTitulo
            eyebrow="Ação"
            titulo="Decisão de compra"
            descricao={`Cobertura alvo: ${alvoDias} dias. Ruptura ≤ 0; Crítica < 50%; Abaixo 50-100%; Saudável 100-200%; Excesso > 200%.`}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionMetricCard
              titulo="Sugestão de compra"
              valor={formatarMoeda(resumoDecisao.custoSugestao)}
              descricao={`${formatarNumero(resumoDecisao.unidadesSugeridas, 0)} un para cobrir ${alvoDias} dias`}
              onClick={() => {
                setSituacao("todas");
                setOrdenacao("sugestao");
              }}
              acaoTitulo="Ordenar a tabela pela maior sugestão de compra"
            />
            <ActionMetricCard
              titulo="Rupturas"
              valor={formatarNumero(resumoDecisao.rupturas, 0)}
              descricao="Estoque zerado ou negativo com demanda no período"
              onClick={() => {
                setSituacao("ruptura");
              }}
              acaoTitulo="Filtrar somente produtos em ruptura"
            />
            <ActionMetricCard
              titulo="Críticas"
              valor={formatarNumero(resumoDecisao.criticos, 0)}
              descricao={`Cobertura abaixo de ${formatarPercentual(0.5, 0)} do alvo`}
              onClick={() => {
                setSituacao("critica");
              }}
              acaoTitulo="Filtrar somente produtos com cobertura crítica"
            />
            <ActionMetricCard
              titulo="Abaixo do alvo"
              valor={formatarNumero(resumoDecisao.abaixo, 0)}
              descricao={`Cobertura entre ${formatarPercentual(0.5, 0)} e ${formatarPercentual(1, 0)} do alvo`}
              onClick={() => {
                setSituacao("abaixo");
              }}
              acaoTitulo="Filtrar somente produtos abaixo do alvo"
            />
            <ActionMetricCard
              titulo="Saudáveis"
              valor={formatarNumero(resumoDecisao.saudaveis, 0)}
              descricao={`Cobertura entre ${formatarPercentual(1, 0)} e ${formatarPercentual(2, 0)} do alvo`}
              onClick={() => {
                setSituacao("saudavel");
              }}
              acaoTitulo="Filtrar somente produtos com cobertura saudável"
            />
            <ActionMetricCard
              titulo="Excesso / sem demanda"
              valor={formatarMoeda(resumoDecisao.excessoCapital + resumoDecisao.semDemandaCapital)}
              descricao={`${resumoDecisao.excessoProdutos} em excesso (>2× alvo) + ${resumoDecisao.semDemandaProdutos} sem demanda`}
              onClick={() => {
                setSituacao("excesso");
                setOrdenacao("estoque-valor");
              }}
              acaoTitulo="Filtrar produtos em excesso ordenando pelo maior capital em estoque"
            />
          </div>
        </section>
      ) : null}

      {periodoConsultado ? (
        <section className="space-y-2">
          <SecaoTitulo
            eyebrow="Contexto"
            titulo="Base do período"
            descricao={`Período completo, sem os filtros da tabela · custo informado em ${formatarPercentual(relatorio.resumo.coberturaCusto, 1)} da demanda`}
          />
          <MetricsStrip
            itens={[
              {
                rotulo: "Vendido",
                valor: formatarMoeda(relatorio.resumo.valorVendido),
                detalhe: `${formatarNumero(relatorio.resumo.quantidadeVendida, 0)} un`,
              },
              {
                rotulo: "Devolvido (EDV)",
                valor: formatarMoeda(relatorio.resumo.valorDevolvido),
                detalhe: `${formatarPercentual(relatorio.resumo.taxaDevolucaoValor, 1)} do valor`,
              },
              {
                rotulo: "Venda líquida",
                valor: formatarMoeda(relatorio.resumo.valorVendaLiquida),
                detalhe: `${formatarNumero(relatorio.resumo.quantidadeLiquidaReal, 0)} un líquidas`,
              },
              {
                rotulo: "Margem bruta",
                valor: formatarMoeda(relatorio.resumo.margemBruta),
                detalhe: `${formatarPercentual(relatorio.resumo.margemBrutaPercentual, 1)} sobre a líquida`,
              },
              {
                rotulo: "Estoque a custo aquisição",
                valor: formatarMoeda(relatorio.resumo.custoEstoqueAquisicao),
                detalhe: `${relatorio.resumo.produtosSemSaldo} sem saldo`,
              },
              {
                rotulo: "Estoque a custo reposição",
                valor: formatarMoeda(relatorio.resumo.custoEstoqueReposicao),
                detalhe: `${relatorio.resumo.produtosSemSaldoLocalizado} sem saldo localizado`,
              },
            ]}
          />
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Produtos para análise de compra</CardTitle>
              <CardDescription>
                Curva ABC pela demanda líquida. Estoque = saldo do último movimento do grupo {grupoEstoquePadrao.trim().toUpperCase() || "GERAL"} até hoje. Cobertura = estoque ÷ média diária. Sugestão = média diária × alvo - estoque.
              </CardDescription>
            </div>
            <ExportDropdown
              onExportarCsv={exportarExcel}
              disabled={loading || itensFiltrados.length === 0}
              label="Exportar Excel"
            />
          </div>
          <DataFilterBar
            busca={busca}
            onBuscaChange={(valor) => {
              setBusca(valor);
            }}
            placeholder="Buscar por descrição, código ou marca..."
            temFiltrosAtivos={
              Boolean(busca) || curva !== "todas" || marca !== "todas" || situacao !== "todas"
            }
            onLimpar={() => {
              setBusca("");
              setCurva("todas");
              setMarca("todas");
              setSituacao("todas");
            }}
          >
            <FiltroRelatorio
              rotulo="Filtrar por curva ABC"
              valor={curva}
              opcoes={[
                { valor: "todas", rotulo: "Todas as curvas" },
                { valor: "A", rotulo: "Curva A" },
                { valor: "B", rotulo: "Curva B" },
                { valor: "C", rotulo: "Curva C" },
              ]}
              onChange={(valor) => {
                setCurva(valor as "todas" | ClasseCurvaCompras);
              }}
            />
            <FiltroRelatorio
              rotulo="Filtrar por marca"
              valor={marca}
              opcoes={[
                { valor: "todas", rotulo: "Todas as marcas" },
                ...marcas.map((nome) => ({ valor: nome, rotulo: nome })),
              ]}
              onChange={(valor) => {
                setMarca(valor);
              }}
            />
            <FiltroRelatorio
              rotulo="Filtrar por situação de estoque"
              valor={situacao}
              opcoes={[
                { valor: "todas", rotulo: "Todas as situações" },
                ...SITUACOES_COMPRA.map((opcao) => ({ valor: opcao.valor, rotulo: opcao.rotulo })),
              ]}
              onChange={(valor) => {
                setSituacao(valor as "todas" | SituacaoCompra);
              }}
            />
            <FiltroRelatorio
              rotulo="Cobertura alvo em dias"
              valor={String(alvoDias)}
              opcoes={opcoesCobertura.map((dias) => ({ valor: String(dias), rotulo: `Alvo ${dias} dias` }))}
              onChange={(valor) => {
                setAlvoDias(Number(valor));
              }}
            />
            <FiltroRelatorio
              rotulo="Ordenar produtos"
              valor={ordenacao}
              opcoes={CRITERIOS_ORDENACAO_COMPRAS.map((criterio) => ({
                valor: criterio.valor,
                rotulo: criterio.rotulo,
              }))}
              onChange={(valor) => {
                setOrdenacao(valor as CriterioOrdenacaoCompras);
              }}
            />
          </DataFilterBar>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : periodoConsultado && itensFiltrados.length > 0 ? (
            <>
              <div className="px-3 pb-3">
                <ReportTable<ItemRelatorioCompras>
                  label="produtos"
                  caption="Produtos para análise de compra"
                  data={itensFiltrados}
                  rowKey={(item) => `${item.produtoId ?? item.codigo}-${item.produto}`}
                  showExport={false}
                  acoesExtras={
                    <ExportDropdown
                      onExportarCsv={exportarExcel}
                      disabled={loading || itensFiltrados.length === 0}
                      label="Exportar Excel"
                    />
                  }
                  columns={[
                    {
                      id: "codigo",
                      header: <>Código</>,
                      kind: "name",
                      value: (item) => item.codigo,
                      cell: (item) => <span className="font-mono">{item.codigo}</span>,
                    },
                    {
                      id: "produto",
                      header: <>Descrição</>,
                      kind: "name",
                      value: (item) => item.produto,
                      cell: (item) => <>{item.produto}</>,
                    },
                    {
                      id: "un",
                      header: <>Un.</>,
                      kind: "name",
                      value: (item) => item.unidade,
                      cell: (item) => <span className="text-muted-foreground">{item.unidade}</span>,
                    },
                    {
                      id: "marca",
                      header: <>Marca</>,
                      kind: "name",
                      value: (item) => item.marca ?? "",
                      cell: (item) => <>{item.marca || "—"}</>,
                    },
                    {
                      id: "curva",
                      header: <>Curva</>,
                      kind: "name",
                      value: (item) => item.curva,
                      cell: (item) => <ClasseBadge classe={item.curva} />,
                    },
                    {
                      id: "vendas",
                      header: <>Vendas no período</>,
                      kind: "number",
                      value: (item) => item.quantidadeVendida,
                      cell: (item) => <>{formatarNumero(item.quantidadeVendida, 0)}</>,
                    },
                    {
                      id: "edv",
                      header: <>Devoluções EDV</>,
                      kind: "number",
                      value: (item) => item.quantidadeDevolvida,
                      cell: (item) => <>{formatarNumero(item.quantidadeDevolvida, 0)}</>,
                    },
                    {
                      id: "demanda",
                      header: <span title="Vendido menos devoluções EDV, limitado ao mínimo zero">Demanda</span>,
                      kind: "number",
                      value: (item) => item.demandaLiquida,
                      cell: (item) => <span className="font-semibold">{formatarNumero(item.demandaLiquida, 0)}</span>,
                    },
                    {
                      id: "estoque",
                      header: <span title="Saldo do movimento mais recente encontrado no Kardex até hoje">Estoque</span>,
                      kind: "number",
                      value: (item) => item.estoqueAtual,
                      cell: (item) => <>{item.estoqueAtual === null ? "-" : formatarNumero(item.estoqueAtual, 0)}</>,
                    },
                    {
                      id: "cobertura",
                      header: <span title="Dias de atendimento com o estoque atual e a média diária de demanda">Cobertura</span>,
                      kind: "number",
                      value: (item) => item.coberturaDias,
                      cell: (item) => (
                        <>{item.coberturaDias === null ? "-" : `${formatarNumero(item.coberturaDias, 1)} d`}</>
                      ),
                    },
                    {
                      id: "situacao",
                      header: <span title="Classificação pela cobertura alvo escolhida na tela">Situação</span>,
                      kind: "name",
                      value: (item) => situacaoEstoque(item, alvoDias),
                      cell: (item) => (
                        <Badge variant={badgeSituacao(situacaoEstoque(item, alvoDias))}>
                          {rotuloSituacao(situacaoEstoque(item, alvoDias))}
                        </Badge>
                      ),
                    },
                    {
                      id: "sugestao",
                      header: <span title="Quantidade para atingir a cobertura alvo descontando o estoque atual">Sugestão</span>,
                      kind: "number",
                      value: (item) => sugestaoCompra(item, alvoDias),
                      cell: (item) => (
                        <span className="font-semibold">{formatarNumero(sugestaoCompra(item, alvoDias), 0)}</span>
                      ),
                    },
                    {
                      id: "custoSugestao",
                      header: <span title="Sugestão de compra × custo de reposição médio">Custo sugestão</span>,
                      kind: "currency",
                      value: (item) => custoSugestaoCompra(item, alvoDias),
                      cell: (item) => (
                        <>{custoSugestaoCompra(item, alvoDias) == null ? "-" : formatarMoeda(custoSugestaoCompra(item, alvoDias) ?? 0)}</>
                      ),
                    },
                    {
                      id: "custoAquisicao",
                      header: <>Custo aquisição</>,
                      kind: "currency",
                      value: (item) => item.custoAquisicaoMedio,
                      cell: (item) => <>{item.custoAquisicaoMedio == null ? "-" : formatarMoeda(item.custoAquisicaoMedio)}</>,
                    },
                    {
                      id: "custoReposicao",
                      header: <>Custo reposição</>,
                      kind: "currency",
                      value: (item) => item.custoReposicaoMedio,
                      cell: (item) => <>{item.custoReposicaoMedio == null ? "-" : formatarMoeda(item.custoReposicaoMedio)}</>,
                    },
                    {
                      id: "estoqueAquisicao",
                      header: <span title="Custo de aquisição médio × estoque atual">Estoque (aquis.)</span>,
                      kind: "currency",
                      value: (item) => item.custoEstoqueAquisicao,
                      cell: (item) => <>{item.custoEstoqueAquisicao == null ? "-" : formatarMoeda(item.custoEstoqueAquisicao)}</>,
                    },
                    {
                      id: "estoqueReposicao",
                      header: <span title="Custo de reposição médio × estoque atual">Estoque (repos.)</span>,
                      kind: "currency",
                      value: (item) => item.custoEstoqueReposicao,
                      cell: (item) => (
                        <span className="font-semibold">
                          {item.custoEstoqueReposicao == null ? "-" : formatarMoeda(item.custoEstoqueReposicao)}
                        </span>
                      ),
                    },
                    {
                      id: "valorVendido",
                      header: <>Valor vendido</>,
                      kind: "currency",
                      value: (item) => item.valorVendido,
                      cell: (item) => <>{formatarMoeda(item.valorVendido)}</>,
                    },
                    {
                      id: "valorDevolvido",
                      header: <>Valor devolvido</>,
                      kind: "currency",
                      value: (item) => item.valorDevolvido,
                      cell: (item) => (
                        <>
                          {formatarMoeda(item.valorDevolvido)}
                          <span className="block text-[10px] text-muted-foreground">
                            {formatarPercentual(item.taxaDevolucaoValor, 1)}
                          </span>
                        </>
                      ),
                    },
                    {
                      id: "vendaLiquida",
                      header: <>Venda líquida</>,
                      kind: "currency",
                      value: (item) => item.valorVendaLiquida,
                      cell: (item) => (
                        <span className="font-semibold">{formatarMoeda(item.valorVendaLiquida)}</span>
                      ),
                    },
                    {
                      id: "margem",
                      header: (
                        <span title="(venda líquida real − custo de reposição das unidades líquidas) ÷ venda líquida real">
                          Margem
                        </span>
                      ),
                      kind: "percent",
                      value: (item) => item.margemBrutaPercentual,
                      cell: (item) => (
                        <span
                          className={
                            item.margemBrutaPercentual != null && item.margemBrutaPercentual < 0
                              ? "font-semibold text-destructive"
                              : "font-semibold"
                          }
                        >
                          {item.margemBrutaPercentual == null
                            ? "-"
                            : formatarPercentual(item.margemBrutaPercentual, 1)}
                        </span>
                      ),
                    },
                  ]}
                  rodape={() => (
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        {formatarNumero(itensFiltrados.length, 0)} produto(s) no recorte
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">{formatarNumero(totais.quantidadeVendida, 0)}</TableCell>
                      <TableCell className="text-right">{formatarNumero(totais.quantidadeDevolvida, 0)}</TableCell>
                      <TableCell className="text-right">{formatarNumero(totais.demandaLiquida, 0)}</TableCell>
                      <TableCell className="text-right">{formatarNumero(totais.estoqueAtual, 0)}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right">{formatarNumero(totais.sugestaoUnidades, 0)}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right">{formatarMoeda(totais.custoEstoqueAquisicao)}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(totais.custoEstoqueReposicao)}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(totais.valorVendido)}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(totais.valorDevolvido)}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(totais.valorVendaLiquida)}</TableCell>
                      <TableCell className="text-right">
                        {totais.margemPercentual == null ? "-" : formatarPercentual(totais.margemPercentual, 1)}
                      </TableCell>
                    </TableRow>
                  )}
                />
              </div>
              <StatusRelatorio
                className="border-t px-3 py-2"
                itens={[
                  {
                    rotulo: "Universo",
                    valor: `${formatarNumero(relatorio.itens.length, 0)} produto(s) · ${empresaNome}`,
                    definicao: "Produtos retornados pela consulta de vendas e Kardex para a empresa e o período.",
                  },
                  {
                    rotulo: "Período",
                    valor: periodoConsultado
                      ? `${formatarDataInputParaBR(periodoConsultado.inicial)} a ${formatarDataInputParaBR(periodoConsultado.final)}`
                      : "—",
                    definicao: "Período consultado no Syspro.",
                  },
                  {
                    rotulo: "Filtros ativos",
                    valor: formatarNumero(
                      (busca.trim() ? 1 : 0) +
                        (curva !== "todas" ? 1 : 0) +
                        (marca !== "todas" ? 1 : 0) +
                        (situacao !== "todas" ? 1 : 0),
                      0,
                    ),
                    destaque: true,
                    definicao: "Conta busca textual, curva ABC, marca e situação aplicados.",
                  },
                ]}
              />
            </>
          ) : periodoConsultado ? (
            <FeedbackState
              variant="empty"
              title="Nenhum produto encontrado"
              description="Não há vendas para os filtros aplicados neste período."
            />
          ) : (
            <FeedbackState
              variant="empty"
              title="Defina o período da análise"
              description="Use Consultar para combinar vendas e movimentações do Kardex."
            />
          )}
        </CardContent>
      </Card>

      <GlossarioRelatorio
        itens={GUIAS_RELATORIOS.compras.glossario ?? []}
        guia={GUIAS_RELATORIOS.compras}
        relatorioLabel="Análise de Compras"
      />
    </div>
  );
}
