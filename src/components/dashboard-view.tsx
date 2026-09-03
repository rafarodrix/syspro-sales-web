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
import { GraficoFaturamento, GraficoProdutos } from "@/components/sales-charts";
import {
  DateRangeFilter,
  periodoMesAtual,
  type Periodo,
} from "@/components/date-range-filter";
import { KpiCard } from "@/components/kpi-card";
import { RankingCard } from "@/components/ranking-card";
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
    empresaInicial && empresas.some((empresa) => empresa.id === empresaInicial)
      ? empresaInicial
      : (empresas[0]?.id ?? ""),
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

  const topProdutos = useMemo(() => produtosMaisVendidos(vendas, 6), [vendas]);
  const destaques = useMemo(() => calcularDestaques(vendas, resumo), [vendas, resumo]);

  const periodoAnteriorCalculado = useMemo(
    () => calcularPeriodoAnterior(periodo.inicial, periodo.final),
    [periodo.inicial, periodo.final],
  );

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
      const [resAtual, resAnterior] = await Promise.all([
        fetch("/api/vendas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresaId,
            dtInicial: dataInputParaSyspro(periodoDaConsulta.inicial),
            dtFinal: dataInputParaSyspro(periodoDaConsulta.final),
          }),
        }),
        compararPeriodoAnterior
          ? fetch("/api/vendas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                empresaId,
                dtInicial: dataInputParaSyspro(ant.inicial),
                dtFinal: dataInputParaSyspro(ant.final),
              }),
            })
          : Promise.resolve(null),
      ]);

      const jsonAtual = await resAtual.json().catch(() => ({}));
      if (!resAtual.ok) {
        throw new Error(jsonAtual.error ?? "Erro ao consultar o dashboard.");
      }
      setVendas(jsonAtual.vendas as VendaProduto[]);

      if (resAnterior) {
        const jsonAnterior = await resAnterior.json().catch(() => ({}));
        if (resAnterior.ok && Array.isArray(jsonAnterior.vendas)) {
          setVendasAnteriores(jsonAnterior.vendas as VendaProduto[]);
        }
      }

      const agora = new Date();
      setUltimaAtualizacao(
        agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      );
      toast.success("Dashboard atualizado com sucesso!");
    } catch (causa) {
      const mensagem =
        causa instanceof Error ? causa.message : "Erro ao atualizar dados.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  }

  const empresaAtual = useMemo(
    () => empresas.find((e) => e.id === empresaId),
    [empresas, empresaId],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header Executivo de BI */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Visão Geral de Vendas
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              BI Executivo
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Building2Icon className="size-3.5 text-primary" />
              {empresaAtual ? empresaAtual.razaoSocial : "Empresa Selecionada"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatarDataInputParaBR(periodo.inicial)} a {formatarDataInputParaBR(periodo.final)}
            </span>
            {ultimaAtualizacao && (
              <>
                <span>•</span>
                <span>Atualizado às {ultimaAtualizacao}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <DateRangeFilter
            value={periodo}
            onChange={setPeriodo}
            onConsultar={consultar}
            loading={loading}
            compact
          />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compararPeriodoAnterior}
                onChange={(e) => setCompararPeriodoAnterior(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary size-3.5"
              />
              <span>Comparar com período anterior</span>
            </label>
          </div>
        </div>
      </div>

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
            {/* KPI 1: Faturamento (Hero KPI em destaque) */}
            <KpiCard
              titulo="Faturamento Total"
              valor={formatarMoeda(resumo.faturamento)}
              subtitulo={resumo.descontos > 0 ? `Descontos: ${formatarMoeda(resumo.descontos)}` : undefined}
              variacao={variacaoFaturamento?.texto}
              valorAnterior={
                resumoAnterior ? formatarMoeda(resumoAnterior.faturamento) : undefined
              }
              tendenciaPositiva={variacaoFaturamento?.positivo}
              neutro={variacaoFaturamento?.neutro}
              destaque={true}
              icone={DollarSignIcon}
            />

            {/* KPI 2: Pedidos */}
            <KpiCard
              titulo="Pedidos Faturados"
              valor={formatarNumero(resumo.notas, 0)}
              variacao={variacaoPedidos?.texto}
              valorAnterior={
                resumoAnterior ? formatarNumero(resumoAnterior.notas, 0) : undefined
              }
              tendenciaPositiva={variacaoPedidos?.positivo}
              neutro={variacaoPedidos?.neutro}
              icone={ShoppingCart}
            />

            {/* KPI 3: Ticket Médio */}
            <KpiCard
              titulo="Ticket Médio"
              valor={formatarMoeda(resumo.ticketMedio)}
              variacao={variacaoTicket?.texto}
              valorAnterior={
                resumoAnterior ? formatarMoeda(resumoAnterior.ticketMedio) : undefined
              }
              tendenciaPositiva={variacaoTicket?.positivo}
              neutro={variacaoTicket?.neutro}
              icone={FileText}
            />

            {/* KPI 4: Clientes Ativos */}
            <KpiCard
              titulo="Clientes Ativos"
              valor={formatarNumero(resumo.clientes, 0)}
              variacao={variacaoClientes?.texto}
              valorAnterior={
                resumoAnterior ? formatarNumero(resumoAnterior.clientes, 0) : undefined
              }
              tendenciaPositiva={variacaoClientes?.positivo}
              neutro={variacaoClientes?.neutro}
              icone={UsersRound}
            />

            {/* KPI 5: Itens Vendidos */}
            <KpiCard
              titulo="Itens Vendidos"
              valor={formatarNumero(resumo.quantidadeItens, 0)}
              variacao={variacaoItens?.texto}
              valorAnterior={
                resumoAnterior
                  ? formatarNumero(resumoAnterior.quantidadeItens, 0)
                  : undefined
              }
              tendenciaPositiva={variacaoItens?.positivo}
              neutro={variacaoItens?.neutro}
              icone={Package}
            />
          </>
        )}
      </section>

      {/* Grid Analítico Principal: Gráfico Temporal (65%) + Insights/Top Produtos (35%) */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Gráfico de Evolução Temporal */}
        <Card className="border-border/60 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Evolução de Vendas
              </CardTitle>
              <CardDescription className="text-xs">
                {compararPeriodoAnterior
                  ? `Comparando com período de ${formatarDataInputParaBR(periodoAnteriorCalculado.inicial)} a ${formatarDataInputParaBR(periodoAnteriorCalculado.final)}`
                  : "Histórico detalhado do período selecionado"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={metrica}
                onValueChange={(valor) => setMetrica(valor as MetricaDeVendas)}
              >
                <SelectTrigger className="h-8 text-xs font-semibold">
                  <SelectValue placeholder="Métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturamento">Faturamento (R$)</SelectItem>
                  <SelectItem value="itens">Itens Vendidos</SelectItem>
                  <SelectItem value="notas">Notas Fiscais</SelectItem>
                </SelectContent>
              </Select>
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
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Top Produtos */}
        <Card className="border-border/60 shadow-xs lg:col-span-6">
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
            <GraficoProdutos dados={topProdutos} />
          </CardContent>
        </Card>

        {/* Departamentos */}
        <div className="lg:col-span-6">
          <RankingCard
            descricao="Participação de cada departamento no faturamento."
            itens={resumo.porDepartamento}
            titulo="Departamentos"
            empresaId={empresaId}
            drilldownParam="departamento"
          />
        </div>

        {/* Vendedores */}
        <div className="lg:col-span-6">
          <RankingCard
            descricao="Faturamento faturado por vendedor responsável."
            itens={resumo.porVendedor}
            titulo="Vendedores"
            empresaId={empresaId}
            drilldownParam="vendedor"
          />
        </div>

        {/* Formas de Pagamento */}
        <div className="lg:col-span-6">
          <RankingCard
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
