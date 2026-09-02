"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2Icon,
  CalendarDaysIcon,
  ChevronDown,
  ChevronRight,
  DollarSignIcon,
  FileText,
  InfoIcon,
  BadgePercentIcon,
  RotateCwIcon,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import type { VendaProduto } from "@/lib/syspro-api";
import {
  dataInputParaSyspro,
  dadosPorMetrica,
  type MetricaDeVendas,
  produtosMaisVendidos,
  resumoVendas,
} from "@/lib/vendas";
import { GraficoFaturamento, GraficoProdutos } from "@/components/sales-charts";
import { type Periodo } from "@/components/date-range-filter";
import { KpiCard } from "@/components/kpi-card";
import { RankingCard } from "@/components/ranking-card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  initialError?: string;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function DashboardView({
  empresas,
  empresaInicial,
  initialPeriod,
  initialVendas = [],
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
  const [erro, setErro] = useState<string | null>(initialError ?? null);
  const [metrica, setMetrica] = useState<MetricaDeVendas>("faturamento");

  const resumo = useMemo(() => resumoVendas(vendas), [vendas]);
  const serieDaMetrica = useMemo(
    () => dadosPorMetrica(vendas, metrica),
    [metrica, vendas],
  );
  const topProdutos = useMemo(() => produtosMaisVendidos(vendas), [vendas]);

  async function consultar(periodoDaConsulta = periodo) {
    if (!empresaId || !periodoDaConsulta.inicial || !periodoDaConsulta.final) {
      toast.error("Preencha o período para atualizar");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          dtInicial: dataInputParaSyspro(periodoDaConsulta.inicial),
          dtFinal: dataInputParaSyspro(periodoDaConsulta.final),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok)
        throw new Error(json.error ?? "Erro ao consultar o dashboard.");
      setVendas(json.vendas as VendaProduto[]);
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
      {/* Dashboard Top Bar Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Dashboard
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Empresa selecionada:</span>
            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
              <Building2Icon className="size-4" />
              {empresaAtual
                ? `${empresaAtual.razaoSocial} (${empresaAtual.cnpj})`
                : "Nenhuma empresa selecionada"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  const proximoPeriodo = hoje();
                  setPeriodo(proximoPeriodo);
                  consultar(proximoPeriodo);
                }}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === hoje().inicial &&
                  periodo.final === hoje().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const proximoPeriodo = periodoMesAtual();
                  setPeriodo(proximoPeriodo);
                  consultar(proximoPeriodo);
                }}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === periodoMesAtual().inicial &&
                  periodo.final === periodoMesAtual().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mês atual
              </button>
              <button
                type="button"
                onClick={() => {
                  const proximoPeriodo = periodoAnterior();
                  setPeriodo(proximoPeriodo);
                  consultar(proximoPeriodo);
                }}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodo.inicial === periodoAnterior().inicial &&
                  periodo.final === periodoAnterior().final
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mês anterior
              </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
              <CalendarDaysIcon className="size-3.5 text-blue-600" />
              <span>
                {formatarDataInputParaBR(periodo.inicial)} –{" "}
                {formatarDataInputParaBR(periodo.final)}
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-blue-600/30 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Link
              href={`/vendas?empresa=${empresaId}`}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              Ver detalhamento de vendas
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {erro ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm font-medium text-destructive">
            {erro}
          </CardContent>
        </Card>
      ) : null}

      {/* KPI Row */}
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Resumo de indicadores"
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
              titulo="Faturamento (R$)"
              valor={moeda.format(resumo.faturamento)}
              icone={DollarSignIcon}
            />
            <KpiCard
              titulo="Pedidos"
              valor={numero.format(resumo.notas)}
              icone={ShoppingCart}
            />
            <KpiCard
              titulo="Clientes"
              valor={numero.format(resumo.clientes)}
              icone={UsersRound}
            />
            <KpiCard
              titulo="Ticket médio (R$)"
              valor={moeda.format(resumo.ticketMedio)}
              icone={FileText}
            />
            <KpiCard
              titulo="Descontos concedidos (R$)"
              valor={moeda.format(resumo.descontos)}
              icone={BadgePercentIcon}
            />
          </>
        )}
      </section>

      {/* Main Charts Row */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">
                Faturamento diário (R$)
              </CardTitle>
              <InfoIcon className="size-4 text-muted-foreground/70" />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={metrica}
                onValueChange={(valor) => setMetrica(valor as MetricaDeVendas)}
              >
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturamento">Faturamento</SelectItem>
                  <SelectItem value="itens">Itens vendidos</SelectItem>
                  <SelectItem value="notas">Notas fiscais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoFaturamento
              dados={serieDaMetrica}
              formato={metrica === "faturamento" ? "moeda" : "numero"}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">
                Top produtos por faturamento (R$)
              </CardTitle>
              <InfoIcon className="size-4 text-muted-foreground/70" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GraficoProdutos dados={topProdutos} />
          </CardContent>
        </Card>
      </section>

      {/* Rankings Row */}
      <section className="grid gap-4 lg:grid-cols-3">
        <RankingCard
          descricao="Participação no faturamento do período."
          itens={resumo.porDepartamento}
          titulo="Departamentos"
        />
        <RankingCard
          descricao="Responsáveis pelas vendas faturadas."
          itens={resumo.porVendedor}
          titulo="Vendedores"
        />
        <RankingCard
          descricao="Distribuição declarada nas notas fiscais."
          itens={resumo.porFormaPagamento}
          titulo="Formas de pagamento"
        />
      </section>

      {/* Footer Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>
            Dados retornados pela API Syspro para o período selecionado.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => consultar()}
          disabled={loading}
          className="gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        >
          <RotateCwIcon
            className={`size-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </div>
    </div>
  );
}

function periodoMesAtual(): Periodo {
  const hoje = new Date();
  const paraInput = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    final: paraInput(hoje),
  };
}

function periodoAnterior(): Periodo {
  const hoje = new Date();
  const paraInput = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };
  return {
    inicial: paraInput(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    final: paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  };
}

function hoje(): Periodo {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  const d = `${ano}-${mes}-${dia}`;
  return { inicial: d, final: d };
}

function formatarDataInputParaBR(dataInput: string) {
  if (!dataInput) return "";
  const parts = dataInput.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataInput;
}
