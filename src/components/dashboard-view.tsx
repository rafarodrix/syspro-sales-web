"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2Icon,
  ChevronRight,
  DollarSignIcon,
  FileText,
  BadgePercentIcon,
  RotateCwIcon,
  ShoppingCart,
  UsersRound,
  Package,
  TrendingUp,
  Award,
  Calendar,
  Layers,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  dataInputParaSyspro,
  dadosPorMetricaComparativa,
  type MetricaDeVendas,
  produtosMaisVendidos,
  resumoVendas,
  calcularVariacao,
  calcularPeriodoAnterior,
  calcularDestaques,
  formatarDataInputParaBR,
} from "@/lib/vendas";
import { buscarVendasApi } from "@/lib/vendas-client";
import { GraficoFaturamento, GraficoProdutos } from "@/components/sales-charts";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { KpiCard } from "@/components/kpi-card";
import { RankingCard } from "@/components/ranking-card";
import { PieChartCard } from "@/components/pie-chart-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface EmpresaOption {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Props {
  empresas: EmpresaOption[];
  empresaInicial?: string;
  initialPeriod?: Periodo;
  initialVendas?: VendaProduto[];
  initialVendasAnteriores?: VendaProduto[];
  initialError?: string;
}

import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/lib/formatters";

export function DashboardView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
  initialVendasAnteriores = [],
  initialError,
}: Props) {
  const [empresaId] = useState(
    empresaInicial === "todas" ||
    (empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial))
      ? empresaInicial
      : (empresas.length > 1 ? "todas" : (empresas[0]?.id ?? "")),
  );
  const [periodo, setPeriodo] = useState<Periodo>(
    initialPeriod ?? periodoMesAtual(),
  );
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<VendaProduto[]>(initialVendas);
  const [vendasAnteriores, setVendasAnteriores] = useState<VendaProduto[]>(
    initialVendasAnteriores,
  );
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [metrica, setMetrica] = useState<MetricaDeVendas>("faturamento");
  const [compararPeriodoAnterior, setCompararPeriodoAnterior] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");

  useEffect(() => {
    const agora = new Date();
    setUltimaAtualizacao(
      agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    );
  }, []);

  const resumo = useMemo(() => resumoVendas(vendas), [vendas]);
  const resumoAnterior = useMemo(
    () => (compararPeriodoAnterior ? resumoVendas(vendasAnteriores) : null),
    [vendasAnteriores, compararPeriodoAnterior],
  );

  const variacaoFaturamento = useMemo(
    () =>
      resumoAnterior
        ? calcularVariacao(resumo.faturamento, resumoAnterior.faturamento)
        : null,
    [resumo.faturamento, resumoAnterior],
  );

  const variacaoPedidos = useMemo(
    () =>
      resumoAnterior
        ? calcularVariacao(resumo.notas, resumoAnterior.notas)
        : null,
    [resumo.notas, resumoAnterior],
  );

  const variacaoTicket = useMemo(
    () =>
      resumoAnterior
        ? calcularVariacao(resumo.ticketMedio, resumoAnterior.ticketMedio)
        : null,
    [resumo.ticketMedio, resumoAnterior],
  );

  const variacaoClientes = useMemo(
    () =>
      resumoAnterior
        ? calcularVariacao(resumo.clientes, resumoAnterior.clientes)
        : null,
    [resumo.clientes, resumoAnterior],
  );

  const variacaoItens = useMemo(
    () =>
      resumoAnterior
        ? calcularVariacao(resumo.quantidadeItens, resumoAnterior.quantidadeItens)
        : null,
    [resumo.quantidadeItens, resumoAnterior],
  );

  const serieDaMetrica = useMemo(
    () =>
      compararPeriodoAnterior
        ? dadosPorMetricaComparativa(vendas, vendasAnteriores, metrica)
        : dadosPorMetricaComparativa(vendas, [], metrica),
    [metrica, vendas, vendasAnteriores, compararPeriodoAnterior],
  );

  const topProdutos = useMemo(() => produtosMaisVendidos(vendas, 5), [vendas]);
  const destaques = useMemo(() => calcularDestaques(vendas, resumo), [vendas, resumo]);

  const periodoAnteriorCalculado = useMemo(
    () => calcularPeriodoAnterior(periodo.inicial, periodo.final),
    [periodo.inicial, periodo.final],
  );

  const periodoAnteriorFormatado = useMemo(() => {
    if (!periodoAnteriorCalculado.inicial || !periodoAnteriorCalculado.final) return "";
    const ini = formatarDataInputParaBR(periodoAnteriorCalculado.inicial);
    const fim = formatarDataInputParaBR(periodoAnteriorCalculado.final);
    return ini === fim ? ini : `${ini} a ${fim}`;
  }, [periodoAnteriorCalculado]);

  async function consultar(periodoDaConsulta = periodo) {
    if (!empresaId || !periodoDaConsulta.inicial || !periodoDaConsulta.final) {
      toast.error("Preencha o período para atualizar");
      return;
    }
    setLoading(true);
    setErro(null);

    const ant = calcularPeriodoAnterior(
      periodoDaConsulta.inicial,
      periodoDaConsulta.final,
    );

    try {
      const [dadosAtual, dadosAnt] = await Promise.all([
        buscarVendasApi(empresaId, periodoDaConsulta),
        compararPeriodoAnterior
          ? buscarVendasApi(empresaId, ant)
          : Promise.resolve([]),
      ]);

      setVendas(dadosAtual);
      setVendasAnteriores(dadosAnt);

      const agora = new Date();
      setUltimaAtualizacao(
        agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      );
      toast.success("Dashboard atualizado com sucesso!");
    } catch {
      setErro("Não foi possível carregar os dados de vendas.");
    } finally {
      setLoading(false);
    }
  }

  const empresaAtual = empresas.find((e) => e.id === empresaId);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Executivo de BI */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {empresaId === "todas" ? "Dashboard Consolidado" : "Dashboard de Vendas"}
          </h1>
          {empresaId === "todas" ? (
            <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs font-bold gap-1 px-2.5 py-0.5">
              <Building2Icon className="size-3.5" />
              <span>Visão Consolidada ({empresas.length} Empresas)</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-mono">
              BI Executivo
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Building2Icon className="size-3.5 text-primary" />
            {empresaId === "todas" ? "Todas as Empresas do Grupo" : (empresaAtual ? empresaAtual.razaoSocial : "Empresa Selecionada")}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatarDataInputParaBR(periodo.inicial)} a {formatarDataInputParaBR(periodo.final)}
          </span>
          {compararPeriodoAnterior && periodoAnteriorFormatado && (
            <>
              <span>•</span>
              <span className="text-primary font-semibold">
                Comparativo: {periodoAnteriorFormatado}
              </span>
            </>
          )}
          {ultimaAtualizacao && (
            <>
              <span>•</span>
              <span>Atualizado às {ultimaAtualizacao}</span>
            </>
          )}
        </div>
      </div>

      {/* Barra de Filtro de Período em Linha Única */}
      <Card className="no-print border-border/60 shadow-xs">
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[280px]">
              <DateRangeFilter
                value={periodo}
                onChange={setPeriodo}
                onConsultar={consultar}
                loading={loading}
              />
            </div>

            <div className="hidden h-5 w-px bg-border/80 lg:block" />

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={compararPeriodoAnterior}
                  onChange={(e) => setCompararPeriodoAnterior(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-3.5 cursor-pointer"
                />
                <span>
                  Comparar com período anterior {periodoAnteriorFormatado ? `(${periodoAnteriorFormatado})` : ""}
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {erro ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      {/* Linha de KPIs Executivos */}
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Indicadores principais"
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="border-border/60 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              titulo="Faturamento Total"
              valor={formatarMoeda(resumo.faturamento)}
              subtitulo={resumo.descontos > 0 ? `Descontos: ${formatarMoeda(resumo.descontos)}` : undefined}
              variacao={variacaoFaturamento?.texto}
              valorAnterior={
                resumoAnterior ? formatarMoeda(resumoAnterior.faturamento) : undefined
              }
              periodoComparado={periodoAnteriorFormatado}
              tendenciaPositiva={variacaoFaturamento?.positivo}
              neutro={variacaoFaturamento?.neutro}
              destaque={true}
              icone={DollarSignIcon}
            />

            <KpiCard
              titulo="Pedidos Faturados"
              valor={formatarNumero(resumo.notas, 0)}
              variacao={variacaoPedidos?.texto}
              valorAnterior={
                resumoAnterior ? formatarNumero(resumoAnterior.notas, 0) : undefined
              }
              periodoComparado={periodoAnteriorFormatado}
              tendenciaPositiva={variacaoPedidos?.positivo}
              neutro={variacaoPedidos?.neutro}
              icone={ShoppingCart}
            />

            <KpiCard
              titulo="Ticket Médio"
              valor={formatarMoeda(resumo.ticketMedio)}
              variacao={variacaoTicket?.texto}
              valorAnterior={
                resumoAnterior ? formatarMoeda(resumoAnterior.ticketMedio) : undefined
              }
              periodoComparado={periodoAnteriorFormatado}
              tendenciaPositiva={variacaoTicket?.positivo}
              neutro={variacaoTicket?.neutro}
              icone={FileText}
            />

            <KpiCard
              titulo="Clientes Ativos"
              valor={formatarNumero(resumo.clientes, 0)}
              variacao={variacaoClientes?.texto}
              valorAnterior={
                resumoAnterior ? formatarNumero(resumoAnterior.clientes, 0) : undefined
              }
              periodoComparado={periodoAnteriorFormatado}
              tendenciaPositiva={variacaoClientes?.positivo}
              neutro={variacaoClientes?.neutro}
              icone={UsersRound}
            />

            <KpiCard
              titulo="Itens Vendidos"
              valor={formatarNumero(resumo.quantidadeItens, 0)}
              variacao={variacaoItens?.texto}
              valorAnterior={
                resumoAnterior
                  ? formatarNumero(resumoAnterior.quantidadeItens, 0)
                  : undefined
              }
              periodoComparado={periodoAnteriorFormatado}
              tendenciaPositiva={variacaoItens?.positivo}
              neutro={variacaoItens?.neutro}
              icone={Package}
            />
          </>
        )}
      </section>

      {/* Mini-Indicadores de Eficiência Comercial & Operacional */}
      {!loading && vendas.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Taxa Média Desconto
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-extrabold text-foreground">
                {formatarPercentual(resumo.taxaDesconto, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({formatarMoeda(resumo.descontos)})
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Itens / Pedido (IPF)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-extrabold text-foreground">
                {formatarNumero(resumo.itensPorNota, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                unidades/nota
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Clientes Recorrentes
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-extrabold text-primary">
                {formatarPercentual(resumo.percentualRecorrencia, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({resumo.clientesRecorrentes} de {resumo.clientes})
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Impacto do Frete
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-extrabold text-foreground">
                {formatarPercentual(resumo.taxaFrete, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({formatarMoeda(resumo.frete)})
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Grid Analítico Principal: Gráfico Temporal (65%) + Insights/Top Produtos (35%) */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Gráfico de Evolução Temporal (Bklit UI Gradient Area) */}
        <Card className="border-border/60 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Evolução de Vendas
              </CardTitle>
              <CardDescription className="text-xs">
                {compararPeriodoAnterior
                  ? `Comparando com período de ${formatarDataInputParaBR(periodoAnteriorCalculado.inicial)} a ${formatarDataInputParaBR(periodoAnteriorCalculado.final)}`
                  : "Histórico detalhado da performance no período"}
              </CardDescription>
            </div>

            {/* Seletor Segmentado de Métricas Bklit UI */}
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 self-start sm:self-auto">
              {[
                { id: "faturamento", label: "Faturamento (R$)" },
                { id: "notas", label: "Pedidos / NF" },
                { id: "itens", label: "Itens Vendidos" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetrica(m.id as MetricaDeVendas)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    metrica === m.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoFaturamento
              dados={serieDaMetrica}
              formato={metrica === "faturamento" ? "moeda" : "numero"}
              temComparacao={compararPeriodoAnterior && vendasAnteriores.length > 0}
            />
          </CardContent>
        </Card>

        {/* Destaques do Período & Performance */}
        <Card className="border-border/60 shadow-xs lg:col-span-4 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Destaques do Período
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Síntese executiva dos principais motores de venda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5 flex-1 justify-around">
            {destaques.melhorDia ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Melhor Dia de Vendas
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono font-bold text-foreground text-sm">
                    {destaques.melhorDia.data}
                  </span>
                  <span className="font-mono font-extrabold text-primary text-base">
                    {formatarMoeda(destaques.melhorDia.total)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {destaques.melhorDia.pedidos} pedidos faturados
                </span>
              </div>
            ) : null}

            {destaques.maiorVenda ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Maior Pedido / NF
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-semibold text-foreground text-xs truncate max-w-[150px]" title={destaques.maiorVenda.cliente}>
                    {destaques.maiorVenda.cliente}
                  </span>
                  <span className="font-mono font-extrabold text-foreground text-sm">
                    {formatarMoeda(destaques.maiorVenda.total)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  NF nº {destaques.maiorVenda.numero}
                </span>
              </div>
            ) : null}

            {destaques.topVendedor ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Top Vendedor
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-semibold text-foreground text-xs truncate max-w-[150px]">
                    {destaques.topVendedor.nome}
                  </span>
                  <span className="font-mono font-extrabold text-foreground text-sm">
                    {formatarMoeda(destaques.topVendedor.total)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {formatarPercentual(destaques.topVendedor.percentual, 1)} do faturamento
                </span>
              </div>
            ) : null}

            {!destaques.melhorDia && !destaques.maiorVenda && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Sem destaques para o período.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Linha de Rankings e Top Produtos com Drill-Down Clicável */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Top Produtos */}
        <div className="lg:col-span-6 flex flex-col">
          <Card className="border-border/60 shadow-xs h-full flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">
                  Top Produtos por Faturamento
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  Mais representativos
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Produtos com maior volume financeiro vendido no período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GraficoProdutos dados={topProdutos} empresaId={empresaId} />
            </CardContent>
          </Card>
        </div>

        {/* Departamentos */}
        <div className="lg:col-span-6 flex flex-col">
          <RankingCard
            descricao="Participação de cada departamento no faturamento."
            itens={resumo.porDepartamento}
            titulo="Departamentos"
            empresaId={empresaId}
            drilldownParam="departamento"
          />
        </div>

        {/* Vendedores */}
        <div className="lg:col-span-6 flex flex-col">
          <RankingCard
            descricao="Faturamento faturado por vendedor responsável."
            itens={resumo.porVendedor}
            titulo="Vendedores"
            empresaId={empresaId}
            drilldownParam="vendedor"
          />
        </div>

        {/* Formas de Pagamento (Pie / Donut Chart Bklit Style) */}
        <div className="lg:col-span-6 flex flex-col">
          <PieChartCard
            descricao="Distribuição dos recebimentos declarados nas notas."
            itens={resumo.porFormaPagamento}
            titulo="Formas de Pagamento"
            empresaId={empresaId}
            drilldownParam="formaPagamento"
          />
        </div>
      </section>

      {/* Footer Executivo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span>
            Dados consolidados via API Syspro ERP. Filtros e agregações processados localmente.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => consultar()}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <RotateCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar Dashboard
        </Button>
      </div>
    </div>
  );
}
