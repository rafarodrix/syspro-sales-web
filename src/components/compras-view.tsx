"use client";

import { useMemo, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { ActionMetricCard } from "@/components/analytics/action-metric-card";
import { AnalysisQueryCard } from "@/components/analytics/analysis-query-card";
import { MetricsStrip } from "@/components/analytics/metrics-strip";
import { DataFilterBar } from "@/components/data-filter-bar";
import { ExportDropdown } from "@/components/export-dropdown";
import { GlossarioRelatorio, GUIAS_RELATORIOS } from "@/components/relatorio-guia";
import {
  DateRangeFilter,
  periodoUltimos90Dias,
  salvarPeriodoCookie,
  type Periodo,
} from "@/components/date-range-filter";
import { FeedbackState } from "@/components/feedback-state";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/formatters";
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
function badgeCurva(curva: ClasseCurvaCompras) {
  if (curva === "A") return "default" as const;
  if (curva === "B") return "secondary" as const;
  return "outline" as const;
}

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
}: {
  empresaId: string;
  empresaNome: string;
  coberturaAlvoInicial: number;
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
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
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
      setPagina(1);
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

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = itensFiltrados.slice(
    (paginaAtual - 1) * porPagina,
    paginaAtual * porPagina,
  );

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
          <div>
            <h2 className="text-sm font-semibold text-foreground">Decisão de compra</h2>
            <p className="text-xs text-muted-foreground">
              Considera os filtros ativos e a cobertura alvo de {alvoDias} dias (parâmetro da tela).
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionMetricCard
              titulo="Sugestão de compra"
              valor={formatarMoeda(resumoDecisao.custoSugestao)}
              descricao={`${formatarNumero(resumoDecisao.unidadesSugeridas, 0)} un para cobrir ${alvoDias} dias`}
              onClick={() => {
                setSituacao("todas");
                setOrdenacao("sugestao");
                setPagina(1);
              }}
              acaoTitulo="Ordenar a tabela pela maior sugestão de compra"
            />
            <ActionMetricCard
              titulo="Rupturas"
              valor={formatarNumero(resumoDecisao.rupturas, 0)}
              descricao="Com demanda no período e estoque zerado ou negativo"
              onClick={() => {
                setSituacao("ruptura");
                setPagina(1);
              }}
              acaoTitulo="Filtrar somente produtos em ruptura"
            />
            <ActionMetricCard
              titulo="Críticas"
              valor={formatarNumero(resumoDecisao.criticos, 0)}
              descricao={`Cobertura abaixo de ${formatarNumero(alvoDias / 2, 0)} dias`}
              onClick={() => {
                setSituacao("critica");
                setPagina(1);
              }}
              acaoTitulo="Filtrar somente produtos com cobertura crítica"
            />
            <ActionMetricCard
              titulo="Capital parado"
              valor={formatarMoeda(resumoDecisao.excessoCapital + resumoDecisao.semDemandaCapital)}
              descricao={`${resumoDecisao.excessoProdutos} em excesso + ${resumoDecisao.semDemandaProdutos} sem demanda`}
              onClick={() => {
                setSituacao("excesso");
                setOrdenacao("estoque-valor");
                setPagina(1);
              }}
              acaoTitulo="Filtrar produtos em excesso ordenando pelo maior capital em estoque"
            />
          </div>
        </section>
      ) : null}

      {periodoConsultado ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Base do período</h2>
            <p className="text-xs text-muted-foreground">
              Período completo, sem os filtros da tabela · custo informado em{" "}
              {formatarPercentual(relatorio.resumo.coberturaCusto, 1)} da demanda
            </p>
          </div>
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
                Curva ABC calculada pela demanda líquida. O estoque usa o saldo do movimento mais
                recente encontrado até hoje.
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
              setPagina(1);
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
              setPagina(1);
            }}
          >
            <Select
              value={curva}
              onValueChange={(valor) => {
                setCurva(valor as "todas" | ClasseCurvaCompras);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-40" aria-label="Filtrar por curva ABC">
                <SelectValue placeholder="Curva ABC" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todas">Todas as curvas</SelectItem>
                  <SelectItem value="A">Curva A</SelectItem>
                  <SelectItem value="B">Curva B</SelectItem>
                  <SelectItem value="C">Curva C</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={marca}
              onValueChange={(valor) => {
                setMarca(valor);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-44" aria-label="Filtrar por marca">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todas">Todas as marcas</SelectItem>
                  {marcas.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={situacao}
              onValueChange={(valor) => {
                setSituacao(valor as "todas" | SituacaoCompra);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-48" aria-label="Filtrar por situação de estoque">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todas">Todas as situações</SelectItem>
                  {SITUACOES_COMPRA.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={String(alvoDias)}
              onValueChange={(valor) => {
                setAlvoDias(Number(valor));
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-48" aria-label="Cobertura alvo em dias">
                <SelectValue placeholder="Cobertura alvo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {opcoesCobertura.map((dias) => (
                    <SelectItem key={dias} value={String(dias)}>
                      Alvo {dias} dias
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={ordenacao}
              onValueChange={(valor) => {
                setOrdenacao(valor as CriterioOrdenacaoCompras);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-52" aria-label="Ordenar produtos">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CRITERIOS_ORDENACAO_COMPRAS.map((criterio) => (
                    <SelectItem key={criterio.valor} value={criterio.valor}>
                      {criterio.rotulo}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Un.</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-center">Curva</TableHead>
                      <TableHead className="text-right">Vendas no periodo</TableHead>
                      <TableHead className="text-right">Devoluções EDV</TableHead>
                      <TableHead className="text-right" title="Vendido menos devoluções EDV, limitado ao mínimo zero">Demanda para compras</TableHead>
                      <TableHead className="text-right" title="Saldo do movimento mais recente encontrado no Kardex até hoje">Estoque atual</TableHead>
                      <TableHead className="text-right" title="Dias de atendimento com o estoque atual e a média diária de demanda">Cobertura</TableHead>
                      <TableHead className="text-center" title="Classificação pela cobertura alvo escolhida na tela">Situação</TableHead>
                      <TableHead className="text-right" title="Quantidade para atingir a cobertura alvo descontando o estoque atual">Sugestão</TableHead>
                      <TableHead className="text-right" title="Sugestão de compra × custo de reposição médio">Custo sugestão</TableHead>
                      <TableHead className="text-right">Custo aquisição</TableHead>
                      <TableHead className="text-right">Custo reposição</TableHead>
                      <TableHead className="text-right" title="Custo de aquisição médio × estoque atual">Estoque a custo aquisição</TableHead>
                      <TableHead className="text-right" title="Custo de reposição médio × estoque atual">Estoque a custo reposição</TableHead>
                      <TableHead className="text-right">Valor vendido</TableHead>
                      <TableHead className="text-right">Valor devolvido</TableHead>
                      <TableHead className="text-right">Venda líquida real</TableHead>
                      <TableHead className="text-right" title="(venda líquida real − custo de reposição das unidades líquidas) ÷ venda líquida real">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensDaPagina.map((item) => (
                      <TableRow key={item.produtoId ?? `${item.codigo}-${item.produto}`}>
                        <TableCell className="font-mono text-xs">{item.codigo || "—"}</TableCell>
                        <TableCell className="font-medium">{item.produto}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{item.unidade}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.marca || "Não informada"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={badgeCurva(item.curva)}>{item.curva}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarNumero(item.quantidadeVendida, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarNumero(item.quantidadeDevolvida, 0)}
                          <span className="block text-[10px] text-muted-foreground">
                            {formatarPercentual(item.taxaDevolucao, 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarNumero(item.demandaLiquida, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.estoqueAtual === null ? "-" : formatarNumero(item.estoqueAtual, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.coberturaDias === null
                            ? "-"
                            : `${formatarNumero(item.coberturaDias, 1)} dias`}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={badgeSituacao(situacaoEstoque(item, alvoDias))}>
                            {rotuloSituacao(situacaoEstoque(item, alvoDias))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarNumero(sugestaoCompra(item, alvoDias), 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {custoSugestaoCompra(item, alvoDias) == null
                            ? "-"
                            : formatarMoeda(custoSugestaoCompra(item, alvoDias) ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.custoAquisicaoMedio == null ? "-" : formatarMoeda(item.custoAquisicaoMedio)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.custoReposicaoMedio == null ? "-" : formatarMoeda(item.custoReposicaoMedio)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.custoEstoqueAquisicao == null ? "-" : formatarMoeda(item.custoEstoqueAquisicao)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.custoEstoqueReposicao == null ? "-" : formatarMoeda(item.custoEstoqueReposicao)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarMoeda(item.valorVendido)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarMoeda(item.valorDevolvido)}
                          <span className="block text-[10px] text-muted-foreground">
                            {formatarPercentual(item.taxaDevolucaoValor, 1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatarMoeda(item.valorVendaLiquida)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            item.margemBrutaPercentual != null && item.margemBrutaPercentual < 0
                              ? "text-destructive"
                              : ""
                          }`}
                        >
                          {item.margemBrutaPercentual == null
                            ? "-"
                            : formatarPercentual(item.margemBrutaPercentual, 1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs font-semibold">
                        Total ({itensFiltrados.length} produto{itensFiltrados.length === 1 ? "" : "s"})
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarNumero(totais.quantidadeVendida, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarNumero(totais.quantidadeDevolvida, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarNumero(totais.demandaLiquida, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarNumero(totais.estoqueAtual, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarNumero(totais.sugestaoUnidades, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarMoeda(resumoDecisao.custoSugestao)}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatarMoeda(totais.custoEstoqueAquisicao)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarMoeda(totais.custoEstoqueReposicao)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatarMoeda(totais.valorVendido)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatarMoeda(totais.valorDevolvido)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatarMoeda(totais.valorVendaLiquida)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          totais.margemPercentual != null && totais.margemPercentual < 0
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {totais.margemPercentual == null
                          ? "-"
                          : formatarPercentual(totais.margemPercentual, 1)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <div className="border-t p-3">
                <TablePagination
                  paginaAtual={paginaAtual}
                  totalItens={itensFiltrados.length}
                  itensPorPagina={porPagina}
                  labelItens="produtos"
                  onPaginaChange={setPagina}
                  onItensPorPaginaChange={(valor) => {
                    setPorPagina(valor);
                    setPagina(1);
                  }}
                />
              </div>
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
